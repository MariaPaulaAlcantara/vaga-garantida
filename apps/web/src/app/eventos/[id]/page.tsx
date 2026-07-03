'use client';

import { ConfirmationWindowInfo } from '@/components/ConfirmationWindowInfo';
import { RequireParticipant } from '@/components/RoleGuard';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, Event, Registration } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  canConfirmRegistration,
  confirmCancelRegistration,
} from '@/lib/confirmation';
import { formatDate } from '@/lib/format';

export default function EventoDetailPage() {
  return (
    <RequireParticipant>
      <EventoDetailContent />
    </RequireParticipant>
  );
}

function EventoDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, token } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [myRegistration, setMyRegistration] = useState<Registration | null>(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [eventData, registrations] = await Promise.all([
        api.getEvent(id, token),
        token ? api.getMyRegistrations(token) : Promise.resolve([]),
      ]);
      setEvent(eventData);
      setMyRegistration(
        registrations.find((r) => r.eventId === id && isActive(r.status)) ?? null,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar');
    }
  }, [id, token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRegister() {
    if (!token) {
      router.push('/login');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      await api.registerForEvent(id, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao inscrever');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!token || !myRegistration) return;
    if (!confirmCancelRegistration()) return;
    setActionLoading(true);
    setError('');
    try {
      await api.cancelRegistration(myRegistration.id, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao cancelar');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirm() {
    if (!token || !myRegistration) return;
    setActionLoading(true);
    setError('');
    try {
      await api.confirmRegistration(myRegistration.id, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao confirmar');
    } finally {
      setActionLoading(false);
    }
  }

  if (!event) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  const confirmationWindow =
    myRegistration?.confirmationWindow ?? event.confirmationWindow;
  const canConfirm = canConfirmRegistration(
    myRegistration?.status ?? '',
    confirmationWindow,
  );
  const canDirectEnroll =
    event.availableSpots > 0 && Boolean(event.confirmationWindow?.isOpen);

  return (
    <div className="space-y-6">
      <Link href="/eventos" className="text-sm text-brand hover:underline">
        ← Voltar aos eventos
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">{event.title}</h1>
        <p className="mt-2 text-slate-600">{event.description}</p>
        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="font-medium text-slate-700">Data</dt>
            <dd className="text-slate-600">{formatDate(event.startsAt)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">Local</dt>
            <dd className="text-slate-600">{event.location}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">Vagas</dt>
            <dd className="text-slate-600">
              {event.occupiedSpots}/{event.capacity} ocupadas
              {event.availableSpots > 0 && ` — ${event.availableSpots} disponíveis`}
            </dd>
          </div>
        </dl>

        {event.confirmationWindow && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Período para confirmar presença
            </h2>
            <ConfirmationWindowInfo window={event.confirmationWindow} />
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          {!myRegistration && event.availabilityStatus !== 'cancelled' && (
            <button
              type="button"
              onClick={handleRegister}
              disabled={actionLoading}
              className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {actionLoading
                ? 'Processando...'
                : event.availabilityStatus === 'full'
                  ? 'Entrar na lista de espera'
                  : canDirectEnroll
                    ? 'Inscrever-se'
                    : 'Reservar vaga'}
            </button>
          )}

          {myRegistration && (
            <div className="w-full space-y-3">
              <p className="text-sm text-slate-600">
                Status: <strong>{statusLabel(myRegistration)}</strong>
              </p>

              {canConfirm && (
                <button
                  onClick={handleConfirm}
                  disabled={actionLoading}
                  className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  Confirmar presença
                </button>
              )}

              {isActive(myRegistration.status) && (
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="rounded-lg border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Cancelar inscrição
                </button>
              )}
            </div>
          )}

          {!user && (
            <p className="text-sm text-slate-500">
              <Link href="/login" className="text-brand hover:underline">
                Entre
              </Link>{' '}
              para reservar sua vaga.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function isActive(status: string) {
  return ['RESERVED', 'CONFIRMED', 'WAITLIST'].includes(status);
}

function statusLabel(reg: Registration) {
  if (reg.status === 'WAITLIST') {
    return `Lista de espera — posição ${reg.waitlistPosition}`;
  }
  const labels: Record<string, string> = {
    RESERVED: 'Vaga reservada — aguardando confirmação',
    CONFIRMED: 'Presença confirmada',
  };
  return labels[reg.status] ?? reg.status;
}
