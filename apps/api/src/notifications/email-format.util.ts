import { ConfigService } from '@nestjs/config';

const BRAND = {
  purple: '#7C3AED',
  purpleDark: '#6D28D9',
  purpleLight: '#F3EEFF',
  purpleBorder: '#D4B8FF',
  cyan: '#00C2D4',
  background: '#F4F4F8',
  text: '#111827',
  muted: '#6B7280',
  white: '#FFFFFF',
};

export interface EmailCta {
  href: string;
  label: string;
}

export function resolveWebAppUrl(config: ConfigService): string {
  const raw =
    config.get<string>('WEB_APP_URL') ??
    config.get<string>('APP_URL') ??
    config.get<string>('CORS_ORIGIN') ??
    'http://localhost:3000';

  return normalizeAppUrl(raw);
}

export function normalizeAppUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized) {
    return 'http://localhost:3000';
  }

  normalized = normalized.replace(/\/+$/, '');

  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  return normalized;
}

export function buildAppPath(appUrl: string, path: string): string {
  const base = normalizeAppUrl(appUrl);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function buildEventUrl(appUrl: string, eventId: string): string {
  return buildAppPath(appUrl, `/eventos/${eventId}`);
}

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

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeAttr(text: string): string {
  return escapeHtml(text);
}

export function emailButton(href: string, label: string): string {
  const safeHref = escapeAttr(href);
  const safeLabel = escapeHtml(label);

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px auto 8px;">
      <tr>
        <td align="center" style="border-radius: 10px; background-color: ${BRAND.purple};">
          <a href="${safeHref}" target="_blank" rel="noopener noreferrer"
             style="display: inline-block; padding: 14px 28px; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 16px; font-weight: 700; color: ${BRAND.white}; text-decoration: none; border-radius: 10px;">
            ${safeLabel}
          </a>
        </td>
      </tr>
    </table>
  `.trim();
}

export function emailLayout(
  title: string,
  body: string,
  appUrl: string,
  cta?: EmailCta,
): string {
  const baseUrl = normalizeAppUrl(appUrl);
  const safeTitle = escapeHtml(title);
  const ctaBlock = cta ? emailButton(cta.href, cta.label) : '';
  const siteLink = escapeAttr(baseUrl);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.background}; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.background}; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: ${BRAND.white}; border-radius: 16px; overflow: hidden; border: 1px solid ${BRAND.purpleBorder};">
          <tr>
            <td style="background: linear-gradient(90deg, ${BRAND.purple}, ${BRAND.cyan}); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 28px 28px 8px;">
              <p style="margin: 0; font-size: 22px; font-weight: 800; color: ${BRAND.text}; letter-spacing: -0.3px;">
                Vaga<span style="color: ${BRAND.purple};">Garantida</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 28px 0;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: ${BRAND.text}; line-height: 1.35;">
                ${safeTitle}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px 0; font-size: 16px; line-height: 1.65; color: ${BRAND.text};">
              ${body}
            </td>
          </tr>
          ${
            ctaBlock
              ? `<tr><td style="padding: 0 28px 8px; text-align: center;">${ctaBlock}</td></tr>`
              : ''
          }
          <tr>
            <td style="padding: 8px 28px 28px; text-align: center;">
              <p style="margin: 0 0 12px; font-size: 14px; color: ${BRAND.muted};">
                Ou acesse pelo link:
                <a href="${siteLink}" target="_blank" rel="noopener noreferrer" style="color: ${BRAND.purple}; font-weight: 600; text-decoration: none;">
                  ${escapeHtml(baseUrl)}
                </a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 28px 24px; background-color: ${BRAND.purpleLight}; border-top: 1px solid ${BRAND.purpleBorder};">
              <p style="margin: 0 0 8px; font-size: 13px; line-height: 1.55; color: ${BRAND.muted};">
                Este é um e-mail <strong style="color: ${BRAND.text};">informativo e transacional</strong>.
                Por favor, <strong style="color: ${BRAND.text};">não responda</strong> esta mensagem — esta caixa não é monitorada.
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: ${BRAND.muted};">
                Você recebeu este aviso porque realizou uma ação no Vaga Garantida (reserva, lista de espera ou cadastro).
              </p>
            </td>
          </tr>
        </table>
        <p style="margin: 16px 0 0; font-size: 12px; color: ${BRAND.muted}; text-align: center;">
          © ${new Date().getFullYear()} Vaga Garantida
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
