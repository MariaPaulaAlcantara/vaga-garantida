import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@vaga-garantida/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
