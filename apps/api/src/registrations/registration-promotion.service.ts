import { Injectable } from '@nestjs/common';
import {
  ConfirmationPolicy,
  Event,
  Prisma,
  RegistrationStatus,
} from '@vaga-garantida/database';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_SPOT_STATUSES: RegistrationStatus[] = [
  RegistrationStatus.RESERVED,
  RegistrationStatus.CONFIRMED,
];

@Injectable()
export class RegistrationPromotionService {
  constructor(private readonly prisma: PrismaService) {}

  async countOccupiedSpots(
    tx: Prisma.TransactionClient,
    eventId: string,
  ): Promise<number> {
    return tx.eventRegistration.count({
      where: {
        eventId,
        status: { in: ACTIVE_SPOT_STATUSES },
      },
    });
  }

  computeConfirmationDeadline(
    event: Event,
    policy: ConfirmationPolicy,
    promoted = false,
  ): Date | null {
    const now = new Date();
    const opensAt = new Date(
      event.startsAt.getTime() - policy.opensHoursBefore * 60 * 60 * 1000,
    );
    const closesAt = new Date(
      event.startsAt.getTime() - policy.closesHoursBefore * 60 * 60 * 1000,
    );

    if (promoted) {
      const promotedDeadline = new Date(
        now.getTime() + policy.promotedConfirmHours * 60 * 60 * 1000,
      );
      return promotedDeadline < closesAt ? promotedDeadline : closesAt;
    }

    if (now < opensAt) {
      return closesAt;
    }

    if (now > closesAt) {
      return null;
    }

    return closesAt;
  }

  isConfirmationWindowOpen(
    event: Event,
    policy: ConfirmationPolicy,
  ): boolean {
    const now = new Date();
    const opensAt = new Date(
      event.startsAt.getTime() - policy.opensHoursBefore * 60 * 60 * 1000,
    );
    const closesAt = new Date(
      event.startsAt.getTime() - policy.closesHoursBefore * 60 * 60 * 1000,
    );
    return now >= opensAt && now <= closesAt;
  }

  async promoteNextInWaitlist(
    tx: Prisma.TransactionClient,
    eventId: string,
    promoted = true,
  ) {
    const event = await tx.event.findUniqueOrThrow({
      where: { id: eventId },
      include: { policy: true },
    });

    if (!event.policy) {
      return null;
    }

    const occupied = await this.countOccupiedSpots(tx, eventId);
    if (occupied >= event.capacity) {
      return null;
    }

    const next = await tx.eventRegistration.findFirst({
      where: { eventId, status: RegistrationStatus.WAITLIST },
      orderBy: [{ waitlistPosition: 'asc' }, { joinedAt: 'asc' }],
    });

    if (!next) {
      return null;
    }

    const deadline = this.computeConfirmationDeadline(
      event,
      event.policy,
      promoted,
    );

    const promotedRegistration = await tx.eventRegistration.update({
      where: { id: next.id },
      data: {
        status: RegistrationStatus.RESERVED,
        waitlistPosition: null,
        confirmationDeadline: deadline,
      },
      include: { user: true },
    });

    await this.reindexWaitlist(tx, eventId);

    return promotedRegistration;
  }

  async reindexWaitlist(tx: Prisma.TransactionClient, eventId: string) {
    const waitlist = await tx.eventRegistration.findMany({
      where: { eventId, status: RegistrationStatus.WAITLIST },
      orderBy: [{ waitlistPosition: 'asc' }, { joinedAt: 'asc' }],
    });

    for (let i = 0; i < waitlist.length; i++) {
      await tx.eventRegistration.update({
        where: { id: waitlist[i].id },
        data: { waitlistPosition: i + 1 },
      });
    }
  }

  async releaseSpotAndPromote(
    tx: Prisma.TransactionClient,
    registrationId: string,
    newStatus: RegistrationStatus,
  ) {
    const registration = await tx.eventRegistration.update({
      where: { id: registrationId },
      data: {
        status: newStatus,
        cancelledAt:
          newStatus === RegistrationStatus.CANCELLED ? new Date() : undefined,
        waitlistPosition: null,
      },
    });

    if (
      newStatus === RegistrationStatus.CANCELLED ||
      newStatus === RegistrationStatus.EXPIRED
    ) {
      return this.promoteNextInWaitlist(tx, registration.eventId, true);
    }

    return null;
  }
}
