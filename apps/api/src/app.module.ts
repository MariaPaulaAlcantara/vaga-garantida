import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { SchedulerJobsModule } from './scheduler/scheduler.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ScheduleModule.forRoot(),
    HealthModule,
    PrismaModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    EventsModule,
    RegistrationsModule,
    SchedulerJobsModule,
  ],
})
export class AppModule {}
