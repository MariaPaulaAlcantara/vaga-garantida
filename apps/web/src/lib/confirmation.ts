export interface ConfirmationWindow {
  opensAt: string;
  closesAt: string;
  isOpen: boolean;
}

export function canConfirmRegistration(
  status: string,
  window?: ConfirmationWindow | null,
): boolean {
  return status === 'RESERVED' && Boolean(window?.isOpen);
}

export function shouldAutoConfirmOnEnrollment(
  window?: ConfirmationWindow | null,
): boolean {
  if (!window) {
    return false;
  }

  return Date.now() >= new Date(window.opensAt).getTime();
}

export function formatConfirmationDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

export function confirmCancelRegistration(): boolean {
  return window.confirm(
    'Tem certeza que deseja cancelar sua inscrição? Se você cancelar, perderá sua vaga nesta aula.',
  );
}

export function confirmationStatusMessage(
  status: string,
  window?: ConfirmationWindow | null,
): string | null {
  if (status !== 'RESERVED' || !window) {
    return null;
  }

  const now = Date.now();
  const opensAt = new Date(window.opensAt).getTime();
  const closesAt = new Date(window.closesAt).getTime();

  if (now < opensAt) {
    return `A confirmação abre em ${formatConfirmationDate(window.opensAt)} e vai até ${formatConfirmationDate(window.closesAt)}`;
  }

  if (now <= closesAt) {
    return `Confirme sua presença até ${formatConfirmationDate(window.closesAt)}`;
  }

  return 'Prazo de confirmação encerrado';
}
