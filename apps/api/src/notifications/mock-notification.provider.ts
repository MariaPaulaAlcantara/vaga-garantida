import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider } from './notification.interface';

@Injectable()
export class MockNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(MockNotificationProvider.name);

  async sendOtp(phone: string, code: string): Promise<void> {
    this.logger.log(`[MOCK OTP] Telefone ${phone}: código ${code}`);
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    this.logger.log(`[MOCK MSG] Telefone ${phone}: ${message}`);
  }
}
