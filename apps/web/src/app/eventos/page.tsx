'use client';

import { useEffect, useState } from 'react';
import { EventCard } from '@/components/EventCard';
import { api, ApiError, Event } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function EventosPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getEvents(token)
      .then(setEvents)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Erro ao carregar'),
      )
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <p className="text-slate-500">Carregando eventos...</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Próximos eventos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Aulas gratuitas de bike com vagas limitadas
      </p>
      <div className="mt-6 space-y-4">
        {events.length === 0 ? (
          <p className="text-slate-500">Nenhum evento disponível no momento.</p>
        ) : (
          events.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}
