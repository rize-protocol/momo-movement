import { Body, Controller, Post } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

import { Public } from '@/common/decorators/auth.decorator';
import { TelegramService } from '@/telegram/telegram.service';
import { TelegramUpdate } from '@/telegram/types';

@Controller('telegram')
export class TelegramController {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly telegramService: TelegramService,
  ) {}

  @Public()
  @Post('webhook')
  async webhook(@Body() body: TelegramUpdate) {
    await this.entityManager.transaction(async (entityManager) => {
      await this.telegramService.handleUpdate(entityManager, body);
    });
  }
}
