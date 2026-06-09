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
} from '@vaga-garantida/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

const ACTIVE_SPOT_STATUSES: RegistrationStatus[] = [
  RegistrationStatus.RESERVED,
  RegistrationStatus.CONFIRMED,
];

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async findAllForOrganizer(organizerId: string) {
    const events = await this.prisma.event.findMany({
      where: { organizerId },
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
      orderBy: { startsAt: 'desc' },
    });

    return events.map((event) => this.mapEventWithAvailability(event));
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
            opensHoursBefore: dto.opensHoursBefore ?? 48,
            closesHoursBefore: dto.closesHoursBefore ?? 12,
            promotedConfirmHours: dto.promotedConfirmHours ?? 4,
          },
        },
      },
      include: { policy: true },
    });

    return this.mapEventWithAvailability({
      ...event,
      _count: { registrations: 0 },
    });
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
        policy: dto.opensHoursBefore
          ? {
              update: {
                opensHoursBefore: dto.opensHoursBefore,
                closesHoursBefore: dto.closesHoursBefore,
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
    await this.getOrganizerEvent(organizer.id, id);

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

    return { message: 'Evento cancelado' };
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
      [key: string]: unknown;
    },
  ) {
    const occupiedSpots = event._count.registrations;
    const availableSpots = Math.max(0, event.capacity - occupiedSpots);

    let availabilityStatus: 'open' | 'full' | 'closed' | 'cancelled';
    if (event.status === EventStatus.CANCELLED) {
      availabilityStatus = 'cancelled';
    } else if (event.status === EventStatus.CLOSED) {
      availabilityStatus = 'closed';
    } else if (availableSpots === 0) {
      availabilityStatus = 'full';
    } else {
      availabilityStatus = 'open';
    }

    const { _count, ...rest } = event;
    return {
      ...rest,
      occupiedSpots,
      availableSpots,
      availabilityStatus,
    };
  }
}
