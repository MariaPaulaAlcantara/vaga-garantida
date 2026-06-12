import { Injectable } from '@nestjs/common';
import {
  ConfirmationPolicy,
  Event,
  Prisma,
  RegistrationStatus,
} from '@vaga-garantida/database';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeConfirmationDeadline,
  isConfirmationWindowOpen,
} from './confirmation-window.util';

const ACTIVE_SPOT_STATUSES: RegistrationStatus[] = [
  RegistrationStatus.RESERVED,
  RegistrationStatus.CONFIRMED,
];

export type WaitlistPositionChange = {
  registrationId: string;
  userId: string;
  newPosition: number;
  previousPosition: number;
};

export type PromotedRegistration = {
  id: string;
  userId: string;
  confirmationDeadline: Date | null;
  user: { email: string; name: string };
  event: {
    id: string;
    title: string;
    startsAt: Date;
    location: string;
  };
};

export type PromotionResult = {
  promoted: PromotedRegistration;
  waitlistChanges: WaitlistPositionChange[];
};

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
    return computeConfirmationDeadline(event.startsAt, policy, { promoted });
  }

  isConfirmationWindowOpen(
    event: Event,
    policy: ConfirmationPolicy,
  ): boolean {
    return isConfirmationWindowOpen(event.startsAt, policy);
  }

  async promoteNextInWaitlist(
    tx: Prisma.TransactionClient,
    eventId: string,
    promoted = true,
  ): Promise<PromotionResult | null> {
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
        lastNotifiedWaitlistPosition: null,
      },
      include: {
        user: { select: { email: true, name: true } },
        event: {
          select: { id: true, title: true, startsAt: true, location: true },
        },
      },
    });

    const waitlistChanges = await this.reindexWaitlist(tx, eventId);

    return { promoted: promotedRegistration, waitlistChanges };
  }

  async reindexWaitlist(
    tx: Prisma.TransactionClient,
    eventId: string,
  ): Promise<WaitlistPositionChange[]> {
    const waitlist = await tx.eventRegistration.findMany({
      where: { eventId, status: RegistrationStatus.WAITLIST },
      orderBy: [{ waitlistPosition: 'asc' }, { joinedAt: 'asc' }],
    });

    const changes: WaitlistPositionChange[] = [];

    for (let i = 0; i < waitlist.length; i++) {
      const newPosition = i + 1;
      const previousPosition = waitlist[i].waitlistPosition;

      if (
        previousPosition !== null &&
        newPosition < previousPosition
      ) {
        changes.push({
          registrationId: waitlist[i].id,
          userId: waitlist[i].userId,
          newPosition,
          previousPosition,
        });
      }

      await tx.eventRegistration.update({
        where: { id: waitlist[i].id },
        data: { waitlistPosition: newPosition },
      });
    }

    return changes;
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
