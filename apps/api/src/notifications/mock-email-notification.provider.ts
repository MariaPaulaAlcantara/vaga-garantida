import { Injectable, Logger } from '@nestjs/common';
import { EmailNotificationProvider } from './email-notification.interface';

@Injectable()
export class MockEmailNotificationProvider implements EmailNotificationProvider {
  private readonly logger = new Logger(MockEmailNotificationProvider.name);

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    this.logger.log(
      `[MOCK EMAIL] Para ${to}\nAssunto: ${subject}\n${html.replace(/<[^>]+>/g, ' ').trim()}`,
    );
  }
}
