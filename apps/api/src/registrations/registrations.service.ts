import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EventStatus,
  RegistrationStatus,
  User,
  UserRole,
} from '@vaga-garantida/database';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  getConfirmationWindow,
  isConfirmationWindowOpen,
  toConfirmationWindowDto,
} from './confirmation-window.util';
import { RegistrationPromotionService } from './registration-promotion.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

const ACTIVE_STATUSES: RegistrationStatus[] = [
  RegistrationStatus.RESERVED,
  RegistrationStatus.CONFIRMED,
  RegistrationStatus.WAITLIST,
];

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly promotion: RegistrationPromotionService,
    private readonly notifications: NotificationDispatchService,
  ) {}

  private assertParticipant(user: User) {
    if (user.role === UserRole.ORGANIZER) {
      throw new ForbiddenException(
        'Organizadores não podem se inscrever em aulas',
      );
    }
  }

  async register(user: User, eventId: string) {
    this.assertParticipant(user);

    const result = await this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: { policy: true },
      });

      if (!event) {
        throw new NotFoundException('Evento não encontrado');
      }

      if (event.organizerId === user.id) {
        throw new ForbiddenException(
          'Você não pode se inscrever na sua própria aula',
        );
      }

      if (event.status !== EventStatus.OPEN) {
        throw new BadRequestException('Evento não está aberto para inscrições');
      }

      const existing = await tx.eventRegistration.findUnique({
        where: { eventId_userId: { eventId, userId: user.id } },
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
        const now = new Date();
        const deadline = event.policy
          ? this.promotion.computeConfirmationDeadline(event, event.policy)
          : null;
        const directConfirm =
          event.policy !== null &&
          isConfirmationWindowOpen(event.startsAt, event.policy, now);

        return tx.eventRegistration.create({
          data: {
            eventId,
            userId: user.id,
            status: directConfirm
              ? RegistrationStatus.CONFIRMED
              : RegistrationStatus.RESERVED,
            confirmationDeadline: directConfirm ? null : deadline,
            ...(directConfirm ? { confirmedAt: now } : {}),
          },
          include: {
            event: {
              select: { id: true, title: true, startsAt: true },
            },
            user: { select: { email: true, name: true } },
          },
        });
      }

      const waitlistCount = await tx.eventRegistration.count({
        where: { eventId, status: RegistrationStatus.WAITLIST },
      });

      return tx.eventRegistration.create({
        data: {
          eventId,
          userId: user.id,
          status: RegistrationStatus.WAITLIST,
          waitlistPosition: waitlistCount + 1,
        },
        include: {
          event: {
            select: { id: true, title: true, startsAt: true },
          },
          user: { select: { email: true, name: true } },
        },
      });
    });

    if (result.status === RegistrationStatus.WAITLIST && result.waitlistPosition) {
      void this.notifications
        .notifyWaitlistPosition({
          registrationId: result.id,
          user: result.user,
          event: result.event,
          position: result.waitlistPosition,
        })
        .catch((err) =>
          this.logger.error('Falha ao avisar entrada na lista de espera', err),
        );
    }

    return result;
  }

  async cancel(user: User, registrationId: string) {
    this.assertParticipant(user);

    const outcome = await this.prisma.$transaction(async (tx) => {
      const registration = await tx.eventRegistration.findUnique({
        where: { id: registrationId },
        include: { event: true },
      });

      if (!registration) {
        throw new NotFoundException('Inscrição não encontrada');
      }

      if (registration.userId !== user.id) {
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

      let promotionResult = null;
      if (wasOccupyingSpot) {
        promotionResult = await this.promotion.promoteNextInWaitlist(
          tx,
          registration.eventId,
          true,
        );
      }

      return {
        promoted: promotionResult?.promoted ?? null,
      };
    });

    void this.dispatchPromotionNotifications(outcome);

    return {
      message: 'Inscrição cancelada',
      promoted: outcome.promoted
        ? { id: outcome.promoted.id, userId: outcome.promoted.userId }
        : null,
    };
  }

  async confirm(user: User, registrationId: string) {
    this.assertParticipant(user);

    const registration = await this.prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: { event: { include: { policy: true } } },
    });

    if (!registration) {
      throw new NotFoundException('Inscrição não encontrada');
    }

    if (registration.userId !== user.id) {
      throw new ForbiddenException('Acesso negado');
    }

    if (registration.status !== RegistrationStatus.RESERVED) {
      throw new BadRequestException('Inscrição não está aguardando confirmação');
    }

    const policy = registration.event.policy;
    if (!policy) {
      throw new BadRequestException('Política de confirmação não configurada');
    }

    const now = new Date();
    const window = getConfirmationWindow(registration.event.startsAt, policy, now);

    if (!window.isOpen) {
      if (now < window.opensAt) {
        throw new BadRequestException(
          `Confirmação disponível a partir de ${window.opensAt.toISOString()}`,
        );
      }
      throw new BadRequestException('Prazo de confirmação expirado');
    }

    const deadline = registration.confirmationDeadline ?? window.closesAt;
    if (now > deadline) {
      throw new BadRequestException('Prazo de confirmação expirado');
    }

    const updated = await this.prisma.eventRegistration.update({
      where: { id: registrationId },
      data: {
        status: RegistrationStatus.CONFIRMED,
        confirmedAt: now,
      },
      include: {
        user: { select: { email: true, name: true } },
        event: {
          select: { id: true, title: true, startsAt: true, location: true },
        },
      },
    });

    void this.notifications
      .notifyPresenceConfirmed({
        user: updated.user,
        event: updated.event,
      })
      .catch((err) =>
        this.logger.error('Falha ao enviar email de presença confirmada', err),
      );

    return updated;
  }

  async findMine(userId: string) {
    const registrations = await this.prisma.eventRegistration.findMany({
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

    return registrations.map((registration) => ({
      ...registration,
      confirmationWindow: toConfirmationWindowDto(
        registration.event.startsAt,
        registration.event.policy,
      ),
    }));
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

    return {
      ...grouped,
      summary: {
        confirmed: grouped.confirmed.length,
        reserved: grouped.reserved.length,
        waitlist: grouped.waitlist.length,
        attended: grouped.attended.length,
        noShow: grouped.noShow.length,
        cancelled: grouped.cancelled.length,
        total: registrations.length,
      },
    };
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

    if (registration.event.status === EventStatus.COMPLETED) {
      throw new BadRequestException(
        'Não é possível marcar presença em aula concluída',
      );
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
      const outcome = await this.prisma.$transaction(async (tx) => {
        await tx.eventRegistration.update({
          where: { id: registration.id },
          data: { status: RegistrationStatus.EXPIRED },
        });

        const promotionResult = await this.promotion.promoteNextInWaitlist(
          tx,
          registration.eventId,
          true,
        );

        return {
          expiredId: registration.id,
          promoted: promotionResult?.promoted ?? null,
        };
      });

      void this.dispatchPromotionNotifications(outcome);
      results.push({
        expiredId: outcome.expiredId,
        promotedId: outcome.promoted?.id ?? null,
      });
    }

    return { processed: results.length, results };
  }

  async processConfirmationReminders() {
    return this.notifications.processConfirmationReminders();
  }

  private async dispatchPromotionNotifications(outcome: {
    promoted: {
      user: { email: string; name: string };
      event: {
        id: string;
        title: string;
        startsAt: Date;
        location: string;
      };
      confirmationDeadline: Date | null;
      status: RegistrationStatus;
    } | null;
  }) {
    if (!outcome.promoted) {
      return;
    }

    try {
      await this.notifications.notifyPromoted({
        user: outcome.promoted.user,
        event: outcome.promoted.event,
        confirmationDeadline: outcome.promoted.confirmationDeadline,
        alreadyConfirmed:
          outcome.promoted.status === RegistrationStatus.CONFIRMED,
      });
    } catch (err) {
      this.logger.error('Falha ao avisar promoção da lista de espera', err);
    }
  }
}
