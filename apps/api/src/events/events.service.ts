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
} from '@vaga-garantida/database';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { PrismaService } from '../prisma/prisma.service';
import { toConfirmationWindowDto } from '../registrations/confirmation-window.util';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

const ACTIVE_SPOT_STATUSES: RegistrationStatus[] = [
  RegistrationStatus.RESERVED,
  RegistrationStatus.CONFIRMED,
];

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationDispatchService,
  ) {}

  async findAllPublic() {
    const events = await this.prisma.event.findMany({
      where: {
        status: { in: [EventStatus.OPEN, EventStatus.CLOSED] },
        startsAt: { gte: new Date() },
      },
      include: {
        policy: true,
        _count: {
          select: {
            registrations: {
              where: { status: { in: ACTIVE_SPOT_STATUSES } },
            },
          },
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    return events.map((event) => this.mapEventWithAvailability(event));
  }

  async findOnePublic(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        policy: true,
        _count: {
          select: {
            registrations: {
              where: { status: { in: ACTIVE_SPOT_STATUSES } },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    return this.mapEventWithAvailability(event);
  }

  async findAllForOrganizer(
    organizerId: string,
    scope: 'upcoming' | 'completed' = 'upcoming',
  ) {
    const now = new Date();

    const where =
      scope === 'upcoming'
        ? {
            organizerId,
            status: {
              in: [EventStatus.DRAFT, EventStatus.OPEN, EventStatus.CLOSED],
            },
            startsAt: { gte: now },
          }
        : {
            organizerId,
            OR: [
              { status: { in: [EventStatus.COMPLETED, EventStatus.CANCELLED] } },
              {
                status: { in: [EventStatus.OPEN, EventStatus.CLOSED] },
                startsAt: { lt: now },
              },
            ],
          };

    const events = await this.prisma.event.findMany({
      where,
      include: {
        policy: true,
        _count: {
          select: {
            registrations: {
              where: { status: { in: ACTIVE_SPOT_STATUSES } },
            },
          },
        },
      },
      orderBy: { startsAt: scope === 'upcoming' ? 'asc' : 'desc' },
    });

    return events.map((event) => this.mapEventWithAvailability(event));
  }

  async processCompletedEvents() {
    const now = new Date();
    const result = await this.prisma.event.updateMany({
      where: {
        status: { in: [EventStatus.OPEN, EventStatus.CLOSED] },
        startsAt: { lt: now },
      },
      data: { status: EventStatus.COMPLETED },
    });

    return { completed: result.count };
  }

  async create(organizer: User, dto: CreateEventDto) {
    const startsAt = new Date(dto.startsAt);
    if (startsAt <= new Date()) {
      throw new BadRequestException('Data do evento deve ser no futuro');
    }

    const event = await this.prisma.event.create({
      data: {
        organizerId: organizer.id,
        title: dto.title,
        description: dto.description,
        startsAt,
        location: dto.location,
        capacity: dto.capacity,
        status: dto.publish ? EventStatus.OPEN : EventStatus.DRAFT,
        policy: {
          create: {
            opensDaysBefore: dto.opensDaysBefore ?? 1,
            closesAtTime: dto.closesAtTime ?? '20:00',
            promotedConfirmHours: dto.promotedConfirmHours ?? 4,
          },
        },
      },
      include: { policy: true },
    });

    const mapped = this.mapEventWithAvailability({
      ...event,
      _count: { registrations: 0 },
    });

    if (dto.publish) {
      void this.notifyParticipantsAboutNewEvent(organizer, event);
    }

    return mapped;
  }

  private async notifyParticipantsAboutNewEvent(
    organizer: User,
    event: {
      id: string;
      title: string;
      description: string;
      startsAt: Date;
      location: string;
    },
  ) {
    try {
      const participants =
        await this.notifications.findParticipantsForNewEvent(organizer.id);

      if (participants.length === 0) {
        return;
      }

      await this.notifications.notifyNewEvent({
        event,
        organizerName: organizer.name,
        participants,
      });
    } catch (err) {
      this.logger.error(
        'Falha inesperada ao avisar participantes sobre nova aula',
        err,
      );
    }
  }

  async update(organizer: User, id: string, dto: UpdateEventDto) {
    const event = await this.getOrganizerEvent(organizer.id, id);

    const confirmedCount = await this.prisma.eventRegistration.count({
      where: {
        eventId: id,
        status: RegistrationStatus.CONFIRMED,
      },
    });

    if (confirmedCount > 0 && (dto.capacity || dto.startsAt)) {
      throw new BadRequestException(
        'Não é possível alterar capacidade ou data com inscrições confirmadas',
      );
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        location: dto.location,
        capacity: dto.capacity,
        status: dto.status,
        policy:
          dto.opensDaysBefore !== undefined ||
          dto.closesAtTime !== undefined ||
          dto.promotedConfirmHours !== undefined
            ? {
                update: {
                  opensDaysBefore: dto.opensDaysBefore,
                  closesAtTime: dto.closesAtTime,
                  promotedConfirmHours: dto.promotedConfirmHours,
                },
              }
            : undefined,
      },
      include: {
        policy: true,
        _count: {
          select: {
            registrations: {
              where: { status: { in: ACTIVE_SPOT_STATUSES } },
            },
          },
        },
      },
    });

    return this.mapEventWithAvailability(updated);
  }

  async cancel(organizer: User, id: string) {
    const event = await this.getOrganizerEvent(organizer.id, id);

    if (event.status === EventStatus.COMPLETED) {
      throw new BadRequestException(
        'Aulas concluídas não podem ser canceladas',
      );
    }

    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('Esta aula já está cancelada');
    }

    await this.prisma.event.update({
      where: { id },
      data: { status: EventStatus.CANCELLED },
    });

    await this.prisma.eventRegistration.updateMany({
      where: {
        eventId: id,
        status: {
          in: [
            RegistrationStatus.RESERVED,
            RegistrationStatus.CONFIRMED,
            RegistrationStatus.WAITLIST,
          ],
        },
      },
      data: {
        status: RegistrationStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    return { message: 'Aula cancelada' };
  }

  async remove(organizer: User, id: string) {
    const event = await this.getOrganizerEvent(organizer.id, id);

    if (event.status === EventStatus.COMPLETED) {
      throw new BadRequestException(
        'Aulas concluídas não podem ser excluídas',
      );
    }

    const registrationCount = await this.prisma.eventRegistration.count({
      where: { eventId: id },
    });

    const canHardDelete =
      event.status === EventStatus.DRAFT || registrationCount === 0;

    if (!canHardDelete) {
      throw new BadRequestException(
        'Aulas publicadas com inscrições devem ser canceladas, não excluídas',
      );
    }

    await this.prisma.event.delete({ where: { id } });

    return { message: 'Aula excluída' };
  }

  private async getOrganizerEvent(organizerId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('Acesso negado');
    }
    return event;
  }

  private mapEventWithAvailability(
    event: {
      _count: { registrations: number };
      capacity: number;
      status: EventStatus;
      startsAt?: Date;
      policy?: {
        opensDaysBefore: number;
        closesAtTime: string;
      } | null;
      [key: string]: unknown;
    },
  ) {
    const occupiedSpots = event._count.registrations;
    const availableSpots = Math.max(0, event.capacity - occupiedSpots);

    let availabilityStatus: 'open' | 'full' | 'closed' | 'cancelled' | 'completed';
    if (event.status === EventStatus.CANCELLED) {
      availabilityStatus = 'cancelled';
    } else if (event.status === EventStatus.COMPLETED) {
      availabilityStatus = 'completed';
    } else if (event.status === EventStatus.CLOSED) {
      availabilityStatus = 'closed';
    } else if (availableSpots === 0) {
      availabilityStatus = 'full';
    } else {
      availabilityStatus = 'open';
    }

    const confirmationWindow =
      event.startsAt && event.policy
        ? toConfirmationWindowDto(event.startsAt, event.policy)
        : undefined;

    const { _count, ...rest } = event;
    return {
      ...rest,
      occupiedSpots,
      availableSpots,
      availabilityStatus,
      confirmationWindow,
    };
  }
}
