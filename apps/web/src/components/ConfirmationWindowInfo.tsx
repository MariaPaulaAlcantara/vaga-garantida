import { ConfirmationWindow, formatConfirmationDate } from '@/lib/confirmation';

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function ConfirmationWindowInfo({
  window,
  registrationStatus,
}: {
  window: ConfirmationWindow;
  registrationStatus?: string;
}) {
  if (registrationStatus === 'CONFIRMED') {
    return (
      <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
        <div className="flex items-center gap-2">
          <CheckIcon />
          <p className="text-base font-bold">Presença confirmada!</p>
        </div>
        <p className="mt-2 text-sm">
          Sua vaga está garantida para esta aula. Enviamos um e-mail com os
          detalhes da confirmação.
        </p>
      </div>
    );
  }

  const now = Date.now();
  const opensAt = new Date(window.opensAt).getTime();
  const closesAt = new Date(window.closesAt).getTime();

  const phase =
    now < opensAt ? 'before' : now <= closesAt ? 'open' : 'closed';

  const phaseLabel = {
    before: 'A confirmação ainda não abriu',
    open: 'Confirmação aberta agora',
    closed: 'Prazo de confirmação encerrado',
  }[phase];

  const phaseClass = {
    before: 'border-brand-border bg-brand-light text-brand',
    open: 'border-accent/30 bg-accent-light text-cyan-900',
    closed: 'border-slate-200 bg-slate-50 text-slate-600',
  }[phase];

  return (
    <div className={`mt-4 rounded-lg border p-4 ${phaseClass}`}>
      <p className="text-sm font-semibold">{phaseLabel}</p>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
          <dt className="font-medium shrink-0">Abre em:</dt>
          <dd>{formatConfirmationDate(window.opensAt)}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
          <dt className="font-medium shrink-0">Confirme até:</dt>
          <dd>{formatConfirmationDate(window.closesAt)}</dd>
        </div>
      </dl>
    </div>
  );
}
