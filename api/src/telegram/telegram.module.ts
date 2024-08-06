import { Module } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';
import { TelegramController } from '@/telegram/telegram.controller';
import { TelegramService } from '@/telegram/telegram.service';
import { UserModule } from '@/user/user.module';

@Module({
  imports: [CommonModule, UserModule],
  controllers: [TelegramController],
  providers: [TelegramService],
})
export class TelegramModule {}
