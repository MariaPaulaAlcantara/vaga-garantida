import { Module } from '@nestjs/common';
import { MockNotificationProvider } from './mock-notification.provider';
import { NOTIFICATION_PROVIDER } from './notification.interface';

@Module({
  providers: [
    {
      provide: NOTIFICATION_PROVIDER,
      useClass: MockNotificationProvider,
    },
  ],
  exports: [NOTIFICATION_PROVIDER],
})
export class NotificationsModule {}
