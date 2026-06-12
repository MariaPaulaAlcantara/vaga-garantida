export function formatEventDate(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

export function emailLayout(title: string, body: string, appUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1e293b; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem; margin: 0 0 16px;">${title}</h1>
  ${body}
  <p style="margin-top: 24px; font-size: 0.875rem; color: #64748b;">
    <a href="${appUrl}" style="color: #059669;">Abrir Vaga Garantida</a>
  </p>
</body>
</html>`.trim();
}
