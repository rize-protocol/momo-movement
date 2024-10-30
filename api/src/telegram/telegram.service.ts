import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';

import { InvitationConfig, TelegramConfig } from '@/common/config/types';
import { SecretManagerService } from '@/common/services/secret-manager.service';
import { TelegramUpdate } from '@/telegram/types';
import { UserService } from '@/user/user.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  private invitationConfig: InvitationConfig;

  private telegramSendPhotoApiUrl: string;

  private telegramBotToken: string;

  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly httpService: HttpService,
    private readonly secretManagerService: SecretManagerService,
  ) {}

  async onModuleInit() {
    const telegramConfig = this.configService.get<TelegramConfig>('telegram');
    if (!telegramConfig) {
      throw new Error('telegram config not found');
    }
    const telegramBotToken = await this.secretManagerService.getConfigValue(telegramConfig.botToken);
    if (!telegramBotToken) {
      throw new Error('telegram token not found');
    }
    this.telegramBotToken = telegramBotToken;

    const invitationConfig = this.configService.get<InvitationConfig>('invitation');
    if (!invitationConfig) {
      throw new Error('invitation config not found');
    }

    this.invitationConfig = invitationConfig;

    this.telegramSendPhotoApiUrl = `https://api.telegram.org/bot${this.telegramBotToken}/sendPhoto`;
  }

  async handleUpdate(entityManager: EntityManager, update: TelegramUpdate) {
    if (update.message?.text?.startsWith('/start')) {
      const referralCode = this.getReferralCode(update);

      const chatId = update.message.chat.id;
      const text =
        'MOMO has now concluded on Movement testnet!\n\n' +
        'If you have played, your score has been collected. Please check back here once mainnet goes live for next steps.\n\n' +
        'You can keep track of MOMO on our socials:\n\n' +
        'https://x.com/CultofMOMO\n' +
        'https://discord.com/invite/xCpW8BA3Ev';

      try {
        await this.httpService.axiosRef.post(this.telegramSendPhotoApiUrl, {
          chat_id: chatId,
          photo: 'AgACAgQAAxkDAAJuMGa0d1HBuMFTFyQpY3Mhe4ttqJsAA5i0MRtABKVRuodYuOoPZm8BAAMCAAN3AAM1BA',
          caption: text,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎮 Play for Airdrop', url: `https://t.me/MomoByRizeBot/momo?startapp=${referralCode}` }],
              [
                { text: 'Community', url: 'https://discord.com/invite/xCpW8BA3Ev' },
                { text: 'Twitter', url: 'https://x.com/CultofMOMO' },
              ],
            ],
          },
        });
      } catch (e) {
        this.logger.log(`[handleUpdate] post error: ${e}`);
      }

      await this.handleCreateResourceAccount(entityManager, referralCode, update);
    }
  }

  private async handleCreateResourceAccount(
    entityManager: EntityManager,
    referralCode: string,
    update: TelegramUpdate,
  ) {
    if (referralCode.length > 0 && referralCode.length !== this.invitationConfig.codeLen) {
      return;
    }

    const telegramIdInt = update.message?.from?.id;
    if (!telegramIdInt) {
      return;
    }
    const telegramId = telegramIdInt.toString();

    this.logger.log(`[handleCreateResourceAccount] referralCode: ${referralCode}, telegramId: ${telegramId}`);
    await this.userService.createUser(telegramId, referralCode, entityManager);
  }

  private getReferralCode(update: TelegramUpdate) {
    let referralCode = '';
    const text = update.message?.text;
    if (text) {
      const startList = text.split(' ');
      if (startList.length === 2) {
        [, referralCode] = startList;
      }
    }

    return referralCode;
  }
}
