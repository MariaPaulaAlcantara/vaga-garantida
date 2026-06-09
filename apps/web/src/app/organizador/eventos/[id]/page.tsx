'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, Event, GroupedRegistrations, Registration } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatStatus, statusColor } from '@/lib/format';

export default function OrganizadorEventoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [grouped, setGrouped] = useState<GroupedRegistrations | null>(null);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

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
    if (!authLoading) {
      if (!token || user?.role !== 'ORGANIZER') {
        router.push('/login');
        return;
      }
      load();
    }
  }, [authLoading, token, user, router, load]);

  async function handleAttendance(registrationId: string, attended: boolean) {
    if (!token) return;
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

  if (!event || !grouped) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      <Link href="/organizador" className="text-sm text-emerald-700 hover:underline">
        ← Voltar ao painel
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">{event.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {formatDate(event.startsAt)} — {event.location}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {event.occupiedSpots}/{event.capacity} vagas ocupadas
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <RegistrationSection
        title="Confirmados"
        registrations={grouped.confirmed}
        onAttendance={handleAttendance}
        actionId={actionId}
        showAttendance
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
        <p className="mt-2 text-sm text-slate-500">Nenhum participante.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {registrations.map((reg) => (
            <li key={reg.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">{reg.user?.name}</p>
                <p className="text-sm text-slate-500">{reg.user?.phone}</p>
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
                      onClick={() => onAttendance(reg.id, true)}
                      disabled={actionId === reg.id}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Presente
                    </button>
                    <button
                      onClick={() => onAttendance(reg.id, false)}
                      disabled={actionId === reg.id}
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
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
