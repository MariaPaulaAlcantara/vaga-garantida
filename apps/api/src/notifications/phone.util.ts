export function toE164Brazil(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('55') && digits.length >= 12) {
    return `+${digits}`;
  }

  return `+55${digits}`;
}
