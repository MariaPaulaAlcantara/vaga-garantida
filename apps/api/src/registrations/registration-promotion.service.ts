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
  shouldAutoConfirmRegistration,
} from './confirmation-window.util';

const ACTIVE_SPOT_STATUSES: RegistrationStatus[] = [
  RegistrationStatus.RESERVED,
  RegistrationStatus.CONFIRMED,
];

export type PromotedRegistration = {
  id: string;
  userId: string;
  status: RegistrationStatus;
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

    const autoConfirm = shouldAutoConfirmRegistration(
      event.startsAt,
      event.policy,
    );

    const promotedRegistration = await tx.eventRegistration.update({
      where: { id: next.id },
      data: {
        status: autoConfirm
          ? RegistrationStatus.CONFIRMED
          : RegistrationStatus.RESERVED,
        waitlistPosition: null,
        confirmationDeadline: autoConfirm ? null : deadline,
        lastNotifiedWaitlistPosition: null,
        ...(autoConfirm ? { confirmedAt: new Date() } : {}),
      },
      include: {
        user: { select: { email: true, name: true } },
        event: {
          select: { id: true, title: true, startsAt: true, location: true },
        },
      },
    });

    await this.reindexWaitlist(tx, eventId);

    return { promoted: promotedRegistration };
  }

  async reindexWaitlist(
    tx: Prisma.TransactionClient,
    eventId: string,
  ): Promise<void> {
    // One round-trip avoids P2028 timeouts from N sequential updates in interactive txs.
    await tx.$executeRaw`
      UPDATE "EventRegistration" AS er
      SET
        "waitlistPosition" = sub.new_position,
        "updatedAt" = CURRENT_TIMESTAMP
      FROM (
        SELECT
          id,
          (ROW_NUMBER() OVER (
            ORDER BY "waitlistPosition" ASC NULLS LAST, "joinedAt" ASC
          ))::integer AS new_position
        FROM "EventRegistration"
        WHERE "eventId" = ${eventId}
          AND status = CAST(${RegistrationStatus.WAITLIST} AS "RegistrationStatus")
      ) AS sub
      WHERE er.id = sub.id
        AND er."waitlistPosition" IS DISTINCT FROM sub.new_position
    `;
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
