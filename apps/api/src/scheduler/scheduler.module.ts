import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { RegistrationsModule } from '../registrations/registrations.module';
import { ConfirmationScheduler } from './confirmation.scheduler';
import { EventCompletionScheduler } from './event-completion.scheduler';

@Module({
  imports: [RegistrationsModule, EventsModule],
  providers: [ConfirmationScheduler, EventCompletionScheduler],
})
export class SchedulerJobsModule {}
