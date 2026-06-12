export const EMAIL_NOTIFICATION_PROVIDER = 'EMAIL_NOTIFICATION_PROVIDER';

export interface EmailNotificationProvider {
  sendEmail(to: string, subject: string, html: string): Promise<void>;
}
