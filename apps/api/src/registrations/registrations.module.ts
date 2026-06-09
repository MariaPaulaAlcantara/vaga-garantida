import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { RegistrationPromotionService } from './registration-promotion.service';

@Module({
  imports: [NotificationsModule],
  controllers: [RegistrationsController],
  providers: [RegistrationsService, RegistrationPromotionService],
  exports: [RegistrationsService, RegistrationPromotionService],
})
export class RegistrationsModule {}
