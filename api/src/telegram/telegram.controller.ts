import { Body, Controller, Post } from '@nestjs/common';

import { Public } from '@/common/decorators/auth.decorator';
import { TelegramService } from '@/telegram/telegram.service';
import { TelegramUpdate } from '@/telegram/types';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Public()
  @Post('webhook')
  async webhook(@Body() body: TelegramUpdate) {
    await this.telegramService.handleUpdate(body);
  }
}
