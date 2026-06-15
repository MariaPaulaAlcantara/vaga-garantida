export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function stripPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function formatPhone(phone: string): string {
  const digits = stripPhoneDigits(phone).slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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
    CONFIRMED: 'bg-brand-light text-brand-dark',
    WAITLIST: 'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-slate-100 text-slate-600',
    EXPIRED: 'bg-red-100 text-red-800',
    ATTENDED: 'bg-accent-light text-cyan-800',
    NO_SHOW: 'bg-red-100 text-red-800',
  };
  return colors[status] ?? 'bg-slate-100 text-slate-600';
}
