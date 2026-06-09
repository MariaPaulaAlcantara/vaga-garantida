import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RegistrationsService } from '../registrations/registrations.service';

@Injectable()
export class ConfirmationScheduler {
  private readonly logger = new Logger(ConfirmationScheduler.name);

  constructor(private readonly registrationsService: RegistrationsService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredConfirmations() {
    const result =
      await this.registrationsService.processExpiredConfirmations();

    if (result.processed > 0) {
      this.logger.log(
        `Processadas ${result.processed} confirmações expiradas`,
      );
    }
  }
}
