export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatStatus(status: string) {
  const labels: Record<string, string> = {
    RESERVED: 'Aguardando confirmação',
    CONFIRMED: 'Confirmado',
    WAITLIST: 'Lista de espera',
    CANCELLED: 'Cancelado',
    EXPIRED: 'Expirado',
    ATTENDED: 'Compareceu',
    NO_SHOW: 'Não compareceu',
  };
  return labels[status] ?? status;
}

export function statusColor(status: string) {
  const colors: Record<string, string> = {
    RESERVED: 'bg-amber-100 text-amber-800',
    CONFIRMED: 'bg-emerald-100 text-emerald-800',
    WAITLIST: 'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-slate-100 text-slate-600',
    EXPIRED: 'bg-red-100 text-red-800',
    ATTENDED: 'bg-green-100 text-green-800',
    NO_SHOW: 'bg-red-100 text-red-800',
  };
  return colors[status] ?? 'bg-slate-100 text-slate-600';
}
