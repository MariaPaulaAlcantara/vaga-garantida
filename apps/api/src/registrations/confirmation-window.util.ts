import { ConfirmationPolicy } from '@vaga-garantida/database';

export type ConfirmationWindow = {
  opensAt: Date;
  closesAt: Date;
  isOpen: boolean;
};

export function computeOpensAt(
  startsAt: Date,
  opensDaysBefore: number,
): Date {
  const opensAt = new Date(startsAt);
  opensAt.setDate(opensAt.getDate() - opensDaysBefore);
  return opensAt;
}

export function computeClosesAt(
  startsAt: Date,
  closesAtTime: string,
): Date {
  const [hours, minutes] = closesAtTime.split(':').map(Number);
  const closesAt = new Date(startsAt);
  closesAt.setDate(closesAt.getDate() - 1);
  closesAt.setHours(hours, minutes, 0, 0);
  return closesAt;
}

export function getConfirmationWindow(
  startsAt: Date,
  policy: Pick<
    ConfirmationPolicy,
    'opensDaysBefore' | 'closesAtTime'
  >,
  now = new Date(),
): ConfirmationWindow {
  const opensAt = computeOpensAt(startsAt, policy.opensDaysBefore);
  const closesAt = computeClosesAt(startsAt, policy.closesAtTime);
  const isOpen = now >= opensAt && now <= closesAt;

  return { opensAt, closesAt, isOpen };
}

export function isConfirmationWindowOpen(
  startsAt: Date,
  policy: Pick<
    ConfirmationPolicy,
    'opensDaysBefore' | 'closesAtTime'
  >,
  now = new Date(),
): boolean {
  return getConfirmationWindow(startsAt, policy, now).isOpen;
}

export function computeConfirmationDeadline(
  startsAt: Date,
  policy: Pick<
    ConfirmationPolicy,
    'opensDaysBefore' | 'closesAtTime' | 'promotedConfirmHours'
  >,
  options: { promoted?: boolean; now?: Date } = {},
): Date | null {
  const now = options.now ?? new Date();
  const { closesAt } = getConfirmationWindow(startsAt, policy, now);

  if (options.promoted) {
    const promotedDeadline = new Date(
      now.getTime() + policy.promotedConfirmHours * 60 * 60 * 1000,
    );
    return promotedDeadline < closesAt ? promotedDeadline : closesAt;
  }

  if (now > closesAt) {
    return null;
  }

  return closesAt;
}

export function toConfirmationWindowDto(
  startsAt: Date,
  policy: Pick<
    ConfirmationPolicy,
    'opensDaysBefore' | 'closesAtTime'
  > | null,
  now = new Date(),
) {
  if (!policy) {
    return undefined;
  }

  const window = getConfirmationWindow(startsAt, policy, now);
  return {
    opensAt: window.opensAt.toISOString(),
    closesAt: window.closesAt.toISOString(),
    isOpen: window.isOpen,
  };
}
