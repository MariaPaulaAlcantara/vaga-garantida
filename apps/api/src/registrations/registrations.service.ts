import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EventStatus,
  RegistrationStatus,
  User,
  UserRole,
} from '@vaga-garantida/database';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrationPromotionService } from './registration-promotion.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

const ACTIVE_STATUSES: RegistrationStatus[] = [
  RegistrationStatus.RESERVED,
  RegistrationStatus.CONFIRMED,
  RegistrationStatus.WAITLIST,
];

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotion: RegistrationPromotionService,
  ) {}

  async register(userId: string, eventId: string) {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: { policy: true },
      });

      if (!event) {
        throw new NotFoundException('Evento não encontrado');
      }

      if (event.status !== EventStatus.OPEN) {
        throw new BadRequestException('Evento não está aberto para inscrições');
      }

      const existing = await tx.eventRegistration.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });

      if (existing && ACTIVE_STATUSES.includes(existing.status)) {
        throw new BadRequestException('Você já possui inscrição ativa neste evento');
      }

      if (existing) {
        await tx.eventRegistration.delete({ where: { id: existing.id } });
      }

      await tx.$executeRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;

      const occupied = await this.promotion.countOccupiedSpots(tx, eventId);

      if (occupied < event.capacity) {
        const deadline = event.policy
          ? this.promotion.computeConfirmationDeadline(event, event.policy)
          : null;

        return tx.eventRegistration.create({
          data: {
            eventId,
            userId,
            status: RegistrationStatus.RESERVED,
            confirmationDeadline: deadline,
          },
          include: {
            event: { select: { title: true, startsAt: true } },
          },
        });
      }

      const waitlistCount = await tx.eventRegistration.count({
        where: { eventId, status: RegistrationStatus.WAITLIST },
      });

      return tx.eventRegistration.create({
        data: {
          eventId,
          userId,
          status: RegistrationStatus.WAITLIST,
          waitlistPosition: waitlistCount + 1,
        },
        include: {
          event: { select: { title: true, startsAt: true } },
        },
      });
    });
  }

  async cancel(userId: string, registrationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const registration = await tx.eventRegistration.findUnique({
        where: { id: registrationId },
        include: { event: true },
      });

      if (!registration) {
        throw new NotFoundException('Inscrição não encontrada');
      }

      if (registration.userId !== userId) {
        throw new ForbiddenException('Acesso negado');
      }

      if (!ACTIVE_STATUSES.includes(registration.status)) {
        throw new BadRequestException('Inscrição não pode ser cancelada');
      }

      const wasOccupyingSpot =
        registration.status === RegistrationStatus.RESERVED ||
        registration.status === RegistrationStatus.CONFIRMED;

      await tx.eventRegistration.update({
        where: { id: registrationId },
        data: {
          status: RegistrationStatus.CANCELLED,
          cancelledAt: new Date(),
          waitlistPosition: null,
        },
      });

      if (registration.status === RegistrationStatus.WAITLIST) {
        await this.promotion.reindexWaitlist(tx, registration.eventId);
      }

      let promoted = null;
      if (wasOccupyingSpot) {
        promoted = await this.promotion.promoteNextInWaitlist(
          tx,
          registration.eventId,
          true,
        );
      }

      return {
        message: 'Inscrição cancelada',
        promoted: promoted
          ? { id: promoted.id, userId: promoted.userId }
          : null,
      };
    });
  }

  async confirm(userId: string, registrationId: string) {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: { event: { include: { policy: true } } },
    });

    if (!registration) {
      throw new NotFoundException('Inscrição não encontrada');
    }

    if (registration.userId !== userId) {
      throw new ForbiddenException('Acesso negado');
    }

    if (registration.status !== RegistrationStatus.RESERVED) {
      throw new BadRequestException('Inscrição não está aguardando confirmação');
    }

    const policy = registration.event.policy;
    if (!policy) {
      throw new BadRequestException('Política de confirmação não configurada');
    }

    if (
      !this.promotion.isConfirmationWindowOpen(registration.event, policy) &&
      !registration.confirmationDeadline
    ) {
      throw new BadRequestException('Janela de confirmação ainda não abriu');
    }

    const now = new Date();
    const deadline =
      registration.confirmationDeadline ??
      this.promotion.computeConfirmationDeadline(
        registration.event,
        policy,
      );

    if (deadline && now > deadline) {
      throw new BadRequestException('Prazo de confirmação expirado');
    }

    return this.prisma.eventRegistration.update({
      where: { id: registrationId },
      data: {
        status: RegistrationStatus.CONFIRMED,
        confirmedAt: now,
      },
    });
  }

  async findMine(userId: string) {
    return this.prisma.eventRegistration.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            location: true,
            status: true,
            capacity: true,
            policy: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async findForEventOrganizer(organizer: User, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    if (event.organizerId !== organizer.id) {
      throw new ForbiddenException('Acesso negado');
    }

    const registrations = await this.prisma.eventRegistration.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, name: true, phone: true } },
      },
      orderBy: [{ status: 'asc' }, { joinedAt: 'asc' }],
    });

    const grouped = {
      confirmed: registrations.filter(
        (r) => r.status === RegistrationStatus.CONFIRMED,
      ),
      reserved: registrations.filter(
        (r) => r.status === RegistrationStatus.RESERVED,
      ),
      waitlist: registrations.filter(
        (r) => r.status === RegistrationStatus.WAITLIST,
      ),
      attended: registrations.filter(
        (r) => r.status === RegistrationStatus.ATTENDED,
      ),
      noShow: registrations.filter(
        (r) => r.status === RegistrationStatus.NO_SHOW,
      ),
      cancelled: registrations.filter(
        (r) =>
          r.status === RegistrationStatus.CANCELLED ||
          r.status === RegistrationStatus.EXPIRED,
      ),
    };

    return grouped;
  }

  async markAttendance(
    organizer: User,
    registrationId: string,
    dto: MarkAttendanceDto,
  ) {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: { event: true },
    });

    if (!registration) {
      throw new NotFoundException('Inscrição não encontrada');
    }

    if (registration.event.organizerId !== organizer.id) {
      throw new ForbiddenException('Acesso negado');
    }

    if (registration.status !== RegistrationStatus.CONFIRMED) {
      throw new BadRequestException(
        'Apenas inscrições confirmadas podem ter presença marcada',
      );
    }

    const status = dto.attended
      ? RegistrationStatus.ATTENDED
      : RegistrationStatus.NO_SHOW;

    return this.prisma.eventRegistration.update({
      where: { id: registrationId },
      data: {
        status,
        attendedAt: dto.attended ? new Date() : null,
      },
    });
  }

  async processExpiredConfirmations() {
    const now = new Date();
    const expired = await this.prisma.eventRegistration.findMany({
      where: {
        status: RegistrationStatus.RESERVED,
        confirmationDeadline: { lt: now },
      },
    });

    const results = [];

    for (const registration of expired) {
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.eventRegistration.update({
          where: { id: registration.id },
          data: { status: RegistrationStatus.EXPIRED },
        });

        const promoted = await this.promotion.promoteNextInWaitlist(
          tx,
          registration.eventId,
          true,
        );

        return { expiredId: registration.id, promotedId: promoted?.id ?? null };
      });

      results.push(result);
    }

    return { processed: results.length, results };
  }
}
