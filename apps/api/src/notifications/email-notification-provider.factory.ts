import { ConfigService } from '@nestjs/config';
import { EmailNotificationProvider } from './email-notification.interface';
import { MailerSendEmailNotificationProvider } from './mailersend-email-notification.provider';
import { MockEmailNotificationProvider } from './mock-email-notification.provider';

export function createEmailNotificationProvider(
  config: ConfigService,
): EmailNotificationProvider {
  const apiToken = config.get<string>('MAILERSEND_API_TOKEN');
  const from = config.get<string>('EMAIL_FROM');

  if (apiToken && from) {
    return new MailerSendEmailNotificationProvider(config);
  }

  return new MockEmailNotificationProvider();
}
