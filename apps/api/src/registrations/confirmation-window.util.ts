import { ConfirmationPolicy } from '@vaga-garantida/database';

const EVENT_TIMEZONE = 'America/Sao_Paulo';

export type ConfirmationWindow = {
  opensAt: Date;
  closesAt: Date;
  isOpen: boolean;
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  };
}

function shiftCalendarDay(
  year: number,
  month: number,
  day: number,
  delta: number,
) {
  const shifted = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function zonedTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const readParts = (date: Date) => {
    const parts = formatter.formatToParts(date);
    const read = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value);
    return {
      year: read('year'),
      month: read('month'),
      day: read('day'),
      hour: read('hour'),
      minute: read('minute'),
    };
  };

  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let guess = desired;

  for (let attempt = 0; attempt < 3; attempt++) {
    const actual = readParts(new Date(guess));
    const actualMs = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
    );
    const diff = desired - actualMs;
    if (diff === 0) {
      break;
    }
    guess += diff;
  }

  return new Date(guess);
}

export function computeOpensAt(
  startsAt: Date,
  opensDaysBefore: number,
): Date {
  const classParts = getZonedParts(startsAt, EVENT_TIMEZONE);
  const openDay = shiftCalendarDay(
    classParts.year,
    classParts.month,
    classParts.day,
    -opensDaysBefore,
  );

  return zonedTimeToUtc(
    EVENT_TIMEZONE,
    openDay.year,
    openDay.month,
    openDay.day,
    classParts.hour,
    classParts.minute,
  );
}

export function computeClosesAt(
  startsAt: Date,
  closesAtTime: string,
): Date {
  const [hours, minutes] = closesAtTime.split(':').map(Number);
  const classParts = getZonedParts(startsAt, EVENT_TIMEZONE);
  const closeDay = shiftCalendarDay(
    classParts.year,
    classParts.month,
    classParts.day,
    -1,
  );

  return zonedTimeToUtc(
    EVENT_TIMEZONE,
    closeDay.year,
    closeDay.month,
    closeDay.day,
    hours,
    minutes,
  );
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

/** Inscrições após o início do período (janela aberta ou já encerrada) vão direto para confirmado. */
export function shouldAutoConfirmRegistration(
  startsAt: Date,
  policy: Pick<
    ConfirmationPolicy,
    'opensDaysBefore' | 'closesAtTime'
  >,
  now = new Date(),
): boolean {
  const { opensAt } = getConfirmationWindow(startsAt, policy, now);
  return now >= opensAt;
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
