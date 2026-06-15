import { ConfirmationWindow, formatConfirmationDate } from '@/lib/confirmation';

export function ConfirmationWindowInfo({
  window,
}: {
  window: ConfirmationWindow;
}) {
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
