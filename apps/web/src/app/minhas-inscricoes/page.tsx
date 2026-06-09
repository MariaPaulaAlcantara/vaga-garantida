'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, Registration } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatStatus, statusColor } from '@/lib/format';

export default function MinhasInscricoesPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getMyRegistrations(token);
      setRegistrations(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
      return;
    }
    load();
  }, [authLoading, token, router, load]);

  async function handleConfirm(id: string) {
    if (!token) return;
    setActionId(id);
    try {
      await api.confirmRegistration(id, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao confirmar');
    } finally {
      setActionId(null);
    }
  }

  async function handleCancel(id: string) {
    if (!token) return;
    setActionId(id);
    try {
      await api.cancelRegistration(id, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao cancelar');
    } finally {
      setActionId(null);
    }
  }

  if (authLoading || loading) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Minhas inscrições</h1>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-4">
        {registrations.length === 0 ? (
          <p className="text-slate-500">
            Você ainda não tem inscrições.{' '}
            <Link href="/eventos" className="text-emerald-700 hover:underline">
              Ver eventos
            </Link>
          </p>
        ) : (
          registrations.map((reg) => (
            <div
              key={reg.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link
                    href={`/eventos/${reg.eventId}`}
                    className="font-semibold text-slate-900 hover:text-emerald-700"
                  >
                    {reg.event?.title ?? 'Evento'}
                  </Link>
                  {reg.event && (
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDate(reg.event.startsAt)}
                    </p>
                  )}
                  {reg.waitlistPosition && (
                    <p className="mt-1 text-sm text-blue-700">
                      Posição na fila: {reg.waitlistPosition}
                    </p>
                  )}
                  {reg.confirmationDeadline && reg.status === 'RESERVED' && (
                    <p className="mt-1 text-sm text-amber-700">
                      Confirme até {formatDate(reg.confirmationDeadline)}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(reg.status)}`}
                >
                  {formatStatus(reg.status)}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                {reg.status === 'RESERVED' && (
                  <button
                    onClick={() => handleConfirm(reg.id)}
                    disabled={actionId === reg.id}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Confirmar presença
                  </button>
                )}
                {['RESERVED', 'CONFIRMED', 'WAITLIST'].includes(reg.status) && (
                  <button
                    onClick={() => handleCancel(reg.id)}
                    disabled={actionId === reg.id}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Histórico</h2>
        <HistorySection token={token!} />
      </div>
    </div>
  );
}

function HistorySection({ token }: { token: string }) {
  const [history, setHistory] = useState<Registration[]>([]);

  useEffect(() => {
    api.getHistory(token).then((data) => {
      const terminal = data.filter((r) =>
        ['ATTENDED', 'NO_SHOW', 'CANCELLED', 'EXPIRED'].includes(r.status),
      );
      setHistory(terminal);
    });
  }, [token]);

  if (history.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">Nenhum histórico ainda.</p>;
  }

  return (
    <ul className="mt-3 space-y-2">
      {history.map((reg) => (
        <li
          key={reg.id}
          className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm"
        >
          <span>{reg.event?.title}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor(reg.status)}`}>
            {formatStatus(reg.status)}
          </span>
        </li>
      ))}
    </ul>
  );
}
