export const NOTIFICATION_PROVIDER = 'NOTIFICATION_PROVIDER';

export interface NotificationProvider {
  sendOtp(phone: string, code: string): Promise<void>;
  sendMessage(phone: string, message: string): Promise<void>;
}
