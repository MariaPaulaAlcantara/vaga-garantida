'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireOrganizer } from '@/components/RoleGuard';
import { api, ApiError, Event } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/format';

type Tab = 'upcoming' | 'completed';

export default function ProfessorPage() {
  return (
    <RequireOrganizer>
      <ProfessorContent />
    </RequireOrganizer>
  );
}

function ProfessorContent() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .getOrganizerEvents(token, tab)
      .then(setEvents)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Erro ao carregar'),
      )
      .finally(() => setLoading(false));
  }, [token, tab]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Minhas aulas</h1>
        {tab === 'upcoming' && (
          <Link
            href="/professor/nova-aula"
            className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark"
          >
            Cadastrar nova aula
          </Link>
        )}
      </div>

      <div className="mt-4 flex gap-2 border-b border-edge">
        <TabButton active={tab === 'upcoming'} onClick={() => setTab('upcoming')}>
          Próximas
        </TabButton>
        <TabButton active={tab === 'completed'} onClick={() => setTab('completed')}>
          Concluídas
        </TabButton>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-slate-500">Carregando...</p>
        ) : events.length === 0 ? (
          <p className="text-slate-500">
            {tab === 'upcoming'
              ? 'Nenhuma aula agendada.'
              : 'Nenhuma aula concluída ainda.'}
          </p>
        ) : (
          events.map((event) => (
            <Link
              key={event.id}
              href={`/professor/aulas/${event.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-5 hover:border-brand-border"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{event.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(event.startsAt)} — {event.location}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {event.occupiedSpots}/{event.capacity} vagas — {event.status}
                  </p>
                </div>
                {tab === 'completed' && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {event.status === 'CANCELLED' ? 'Cancelada' : 'Concluída'}
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? 'border-brand text-brand'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
