import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InvitationConfig, TelegramConfig } from '@/common/config/types';
import { TelegramUpdate } from '@/telegram/types';

@Injectable()
export class TelegramService {
  private readonly invitationConfig: InvitationConfig;

  private readonly telegramBotToken: string;

  constructor(private readonly configService: ConfigService) {
    const telegramConfig = this.configService.get<TelegramConfig>('telegram');
    if (!telegramConfig) {
      throw new Error('telegram config not found');
    }
    this.telegramBotToken = telegramConfig.botToken;

    const invitationConfig = this.configService.get<InvitationConfig>('invitation');
    if (!invitationConfig) {
      throw new Error('invitation config not found');
    }

    this.invitationConfig = invitationConfig;
  }

  async handleUpdate(update: TelegramUpdate) {
    if (update.message?.text?.startsWith('/start')) {
      await this.handleStart(update);
    }
  }

  async handleStart(update: TelegramUpdate) {
    const text = update.message?.text;
    if (!text) {
      return;
    }
    const startList = text.split(' ');
    if (startList.length !== 2) {
      return;
    }
    const referralCode = startList[1];

    if (referralCode.length !== this.invitationConfig.codeLen) {
      return;
    }

    console.log(`referralCode: ${referralCode}`);
  }
}
