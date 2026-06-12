import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailNotificationProvider } from './email-notification.interface';
import { parseEmailFrom } from './parse-email-from.util';

@Injectable()
export class MailerSendEmailNotificationProvider implements EmailNotificationProvider {
  private readonly logger = new Logger(MailerSendEmailNotificationProvider.name);
  private readonly apiToken: string;
  private readonly from: { email: string; name?: string };

  constructor(private readonly config: ConfigService) {
    this.apiToken = this.config.getOrThrow<string>('MAILERSEND_API_TOKEN');
    this.from = parseEmailFrom(this.config.getOrThrow<string>('EMAIL_FROM'));
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        from: this.from,
        to: [{ email: to }],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`MailerSend erro ${response.status}: ${body}`);
      throw new Error(`Falha ao enviar email: ${response.status}`);
    }

    const messageId = response.headers.get('x-message-id');
    this.logger.log(
      `Email enviado para ${to} — message-id: ${messageId ?? 'n/a'}`,
    );
  }
}
