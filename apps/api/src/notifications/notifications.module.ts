import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createNotificationProvider } from './notification-provider.factory';
import { NOTIFICATION_PROVIDER } from './notification.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: NOTIFICATION_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createNotificationProvider(config),
    },
  ],
  exports: [NOTIFICATION_PROVIDER],
})
export class NotificationsModule {}
