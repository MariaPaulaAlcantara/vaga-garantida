import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventsService } from '../events/events.service';

@Injectable()
export class EventCompletionScheduler {
  private readonly logger = new Logger(EventCompletionScheduler.name);

  constructor(private readonly eventsService: EventsService) {}

  @Cron('*/15 * * * *')
  async handleCompletedEvents() {
    const result = await this.eventsService.processCompletedEvents();

    if (result.completed > 0) {
      this.logger.log(`${result.completed} aula(s) marcada(s) como concluída(s)`);
    }
  }
}
