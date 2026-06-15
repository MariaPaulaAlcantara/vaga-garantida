'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError, Event } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/format';

export default function OrganizadorPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!token || user?.role !== 'ORGANIZER') {
        router.push('/login');
        return;
      }
      api
        .getOrganizerEvents(token)
        .then(setEvents)
        .catch((err) =>
          setError(err instanceof ApiError ? err.message : 'Erro ao carregar'),
        )
        .finally(() => setLoading(false));
    }
  }, [authLoading, token, user, router]);

  if (authLoading || loading) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Painel do organizador</h1>
        <Link
          href="/organizador/novo-evento"
          className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark"
        >
          Novo evento
        </Link>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-4">
        {events.length === 0 ? (
          <p className="text-slate-500">Nenhum evento criado ainda.</p>
        ) : (
          events.map((event) => (
            <Link
              key={event.id}
              href={`/organizador/eventos/${event.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-5 hover:border-brand-border"
            >
              <h2 className="font-semibold text-slate-900">{event.title}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {formatDate(event.startsAt)} — {event.location}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {event.occupiedSpots}/{event.capacity} vagas — {event.status}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
