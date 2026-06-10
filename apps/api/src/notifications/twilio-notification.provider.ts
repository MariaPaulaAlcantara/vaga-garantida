import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio = require('twilio');
import { NotificationProvider } from './notification.interface';
import { toE164Brazil } from './phone.util';

@Injectable()
export class TwilioNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(TwilioNotificationProvider.name);
  private readonly client: ReturnType<typeof Twilio>;
  private readonly fromNumber: string;

  constructor(private readonly config: ConfigService) {
    const accountSid = this.config.getOrThrow<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.getOrThrow<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.config.getOrThrow<string>('TWILIO_PHONE_NUMBER');
    this.client = Twilio(accountSid, authToken);
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    const body = `Seu código Vaga Garantida: ${code}. Válido por 5 minutos.`;
    await this.sendSms(phone, body);
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    await this.sendSms(phone, message);
  }

  private async sendSms(phone: string, body: string): Promise<void> {
    const to = toE164Brazil(phone);

    const message = await this.client.messages.create({
      to,
      from: this.fromNumber,
      body,
    });

    this.logger.log(
      `SMS criado para ${to} — SID: ${message.sid}, status: ${message.status}`,
    );

    if (message.errorCode) {
      this.logger.error(
        `Twilio erro ${message.errorCode}: ${message.errorMessage}`,
      );
    }
  }
}
