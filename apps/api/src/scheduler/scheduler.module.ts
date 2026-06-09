import { Module } from '@nestjs/common';
import { RegistrationsModule } from '../registrations/registrations.module';
import { ConfirmationScheduler } from './confirmation.scheduler';

@Module({
  imports: [RegistrationsModule],
  providers: [ConfirmationScheduler],
})
export class SchedulerJobsModule {}
