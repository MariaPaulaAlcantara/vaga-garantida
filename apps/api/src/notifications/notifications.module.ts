import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { createEmailNotificationProvider } from './email-notification-provider.factory';
import { EMAIL_NOTIFICATION_PROVIDER } from './email-notification.interface';
import { NotificationDispatchService } from './notification-dispatch.service';
import { createNotificationProvider } from './notification-provider.factory';
import { NOTIFICATION_PROVIDER } from './notification.interface';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    {
      provide: NOTIFICATION_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createNotificationProvider(config),
    },
    {
      provide: EMAIL_NOTIFICATION_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createEmailNotificationProvider(config),
    },
    NotificationDispatchService,
  ],
  exports: [NOTIFICATION_PROVIDER, EMAIL_NOTIFICATION_PROVIDER, NotificationDispatchService],
})
export class NotificationsModule {}
