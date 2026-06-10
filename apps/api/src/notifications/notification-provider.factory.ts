import { ConfigService } from '@nestjs/config';
import { MockNotificationProvider } from './mock-notification.provider';
import { NotificationProvider } from './notification.interface';
import { TwilioNotificationProvider } from './twilio-notification.provider';

export function createNotificationProvider(
  config: ConfigService,
): NotificationProvider {
  const accountSid = config.get<string>('TWILIO_ACCOUNT_SID');
  const authToken = config.get<string>('TWILIO_AUTH_TOKEN');
  const fromNumber = config.get<string>('TWILIO_PHONE_NUMBER');

  if (accountSid && authToken && fromNumber) {
    return new TwilioNotificationProvider(config);
  }

  return new MockNotificationProvider();
}
