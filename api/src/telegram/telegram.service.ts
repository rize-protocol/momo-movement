import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';

import { InvitationConfig, TelegramConfig } from '@/common/config/types';
import { TelegramUpdate } from '@/telegram/types';
import { UserService } from '@/user/user.service';

@Injectable()
export class TelegramService {
  private readonly invitationConfig: InvitationConfig;

  private readonly telegramBotToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
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

  async handleUpdate(entityManager: EntityManager, update: TelegramUpdate) {
    if (update.message?.text?.startsWith('/start')) {
      await this.handleStart(entityManager, update);
    }
  }

  async handleStart(entityManager: EntityManager, update: TelegramUpdate) {
    const text = update.message?.text;
    if (!text) {
      return;
    }

    let referralCode = '';
    const startList = text.split(' ');
    if (startList.length === 2) {
      [, referralCode] = startList;
    }

    if (referralCode.length > 0 && referralCode.length !== this.invitationConfig.codeLen) {
      return;
    }

    const telegramIdInt = update.message?.from?.id;
    if (!telegramIdInt) {
      return;
    }
    const telegramId = telegramIdInt.toString();

    await this.userService.createUser(telegramId, referralCode, entityManager);
  }
}
