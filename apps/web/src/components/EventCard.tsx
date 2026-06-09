import Link from 'next/link';
import { Event } from '@/lib/api';
import { formatDate } from '@/lib/format';

export function EventCard({ event }: { event: Event }) {
  const statusLabel = {
    open: 'Vagas disponíveis',
    full: 'Lotado — lista de espera',
    closed: 'Encerrado',
    cancelled: 'Cancelado',
  }[event.availabilityStatus];

  const statusClass = {
    open: 'text-emerald-700',
    full: 'text-amber-700',
    closed: 'text-slate-500',
    cancelled: 'text-red-600',
  }[event.availabilityStatus];

  return (
    <Link
      href={`/eventos/${event.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
    >
      <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
      <p className="mt-1 text-sm text-slate-500">{formatDate(event.startsAt)}</p>
      <p className="mt-1 text-sm text-slate-500">{event.location}</p>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className={statusClass}>{statusLabel}</span>
        <span className="text-slate-500">
          {event.occupiedSpots}/{event.capacity} vagas
        </span>
      </div>
    </Link>
  );
}
