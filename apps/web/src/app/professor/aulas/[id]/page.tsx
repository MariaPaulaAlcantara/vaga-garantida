'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RequireOrganizer } from '@/components/RoleGuard';
import { api, ApiError, Event, GroupedRegistrations, Registration } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatPhone, formatStatus, statusColor } from '@/lib/format';

export default function ProfessorAulaPage() {
  return (
    <RequireOrganizer>
      <ProfessorAulaContent />
    </RequireOrganizer>
  );
}

function ProfessorAulaContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [grouped, setGrouped] = useState<GroupedRegistrations | null>(null);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [eventData, registrations] = await Promise.all([
        api.getEvent(id, token),
        api.getEventRegistrations(id, token),
      ]);
      setEvent(eventData);
      setGrouped(registrations);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar');
    }
  }, [id, token]);

  useEffect(() => {
    load();
  }, [load]);

  const isCompleted =
    event?.status === 'COMPLETED' || event?.status === 'CANCELLED';
  const canHardDelete =
    event &&
    event.status !== 'COMPLETED' &&
    event.status !== 'CANCELLED' &&
    (event.status === 'DRAFT' || event.occupiedSpots === 0);

  async function handleAttendance(registrationId: string, attended: boolean) {
    if (!token || isCompleted) return;
    setActionId(registrationId);
    try {
      await api.markAttendance(registrationId, attended, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao marcar presença');
    } finally {
      setActionId(null);
    }
  }

  async function handleDeleteOrCancel() {
    if (!token || !event) return;

    const isCancel = !canHardDelete;
    const message = isCancel
      ? 'Cancelar esta aula? Todas as inscrições ativas serão canceladas.'
      : 'Excluir esta aula permanentemente? Esta ação não pode ser desfeita.';

    if (!window.confirm(message)) return;

    setDeleteLoading(true);
    setError('');
    try {
      if (isCancel) {
        await api.cancelEvent(id, token);
      } else {
        await api.deleteEvent(id, token);
        router.push('/professor');
        return;
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao remover aula');
    } finally {
      setDeleteLoading(false);
    }
  }

  if (!event || !grouped) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      <Link href="/professor" className="text-sm text-brand hover:underline">
        ← Voltar às minhas aulas
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{event.title}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {formatDate(event.startsAt)} — {event.location}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {event.occupiedSpots}/{event.capacity} vagas ocupadas — {event.status}
            </p>
          </div>
          {!isCompleted && (
            <button
              type="button"
              onClick={handleDeleteOrCancel}
              disabled={deleteLoading}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleteLoading
                ? 'Processando...'
                : canHardDelete
                  ? 'Excluir aula'
                  : 'Cancelar aula'}
            </button>
          )}
        </div>
      </div>

      {isCompleted && grouped.summary && (
        <section className="rounded-xl border border-brand-border bg-brand-light p-5">
          <h2 className="font-semibold text-slate-900">Resumo da aula</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <SummaryItem label="Compareceram" value={grouped.summary.attended} />
            <SummaryItem label="Faltaram" value={grouped.summary.noShow} />
            <SummaryItem label="Confirmados" value={grouped.summary.confirmed} />
            <SummaryItem label="Aguardando conf." value={grouped.summary.reserved} />
            <SummaryItem label="Lista de espera" value={grouped.summary.waitlist} />
            <SummaryItem label="Cancelados/expirados" value={grouped.summary.cancelled} />
          </dl>
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <RegistrationSection
        title="Confirmados"
        registrations={grouped.confirmed}
        onAttendance={isCompleted ? undefined : handleAttendance}
        actionId={actionId}
        showAttendance={!isCompleted}
      />

      <RegistrationSection
        title="Aguardando confirmação"
        registrations={grouped.reserved}
      />

      <RegistrationSection
        title="Lista de espera"
        registrations={grouped.waitlist}
        showPosition
      />

      <RegistrationSection title="Compareceram" registrations={grouped.attended} />

      <RegistrationSection title="Não compareceram" registrations={grouped.noShow} />

      <RegistrationSection title="Cancelados / Expirados" registrations={grouped.cancelled} />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/80 px-3 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-lg font-bold text-slate-900">{value}</dd>
    </div>
  );
}

function RegistrationSection({
  title,
  registrations,
  onAttendance,
  actionId,
  showAttendance,
  showPosition,
}: {
  title: string;
  registrations: Registration[];
  onAttendance?: (id: string, attended: boolean) => void;
  actionId?: string | null;
  showAttendance?: boolean;
  showPosition?: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-900">
        {title} ({registrations.length})
      </h2>
      {registrations.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Nenhum aluno.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {registrations.map((reg) => (
            <li key={reg.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">{reg.user?.name}</p>
                <p className="text-sm text-slate-500">
                  {reg.user?.phone ? formatPhone(reg.user.phone) : ''}
                </p>
                {showPosition && reg.waitlistPosition && (
                  <p className="text-sm text-blue-600">
                    Posição {reg.waitlistPosition}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${statusColor(reg.status)}`}
                >
                  {formatStatus(reg.status)}
                </span>
                {showAttendance && onAttendance && (
                  <>
                    <button
                      type="button"
                      onClick={() => onAttendance(reg.id, true)}
                      disabled={actionId === reg.id}
                      className="cursor-pointer rounded-lg bg-brand px-2.5 py-1 text-xs text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Presente
                    </button>
                    <button
                      type="button"
                      onClick={() => onAttendance(reg.id, false)}
                      disabled={actionId === reg.id}
                      className="cursor-pointer rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Ausente
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
