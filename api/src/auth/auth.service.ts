import { createHmac } from 'crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { TelegramConfig } from '@/common/config/types';

@Injectable()
export class AuthService {
  private readonly telegramBotToken: string;

  constructor(private readonly configService: ConfigService) {
    const telegramConfig = this.configService.get<TelegramConfig>('telegram');
    if (!telegramConfig) {
      throw new Error('telegram config not found');
    }
    this.telegramBotToken = telegramConfig.botToken;
  }

  verifyTelegramInitData(request: Request) {
    const initData = request.headers.tginitdata as string;
    const decodedInitData = decodeURIComponent(initData);

    const secretKey = this.generateSecretKey();
    const { hash, dataCheckString } = this.mustGetHashAndDataCheckString(decodedInitData);

    const calculateHash = createHmac('sha256', secretKey.digest()).update(dataCheckString).digest('hex');

    return calculateHash === hash;
  }

  getTelegramUid(request: Request) {
    const initData = request.headers.tginitdata as string;
    const decodedInitData = decodeURIComponent(initData);

    const urlParams = new URLSearchParams(decodedInitData);
    return urlParams.get('user');
  }

  private mustGetHashAndDataCheckString(decodedInitData: string) {
    const arr = decodedInitData.split('&');
    const hashIndex = arr.findIndex((str) => str.startsWith('hash='));

    const hash = arr.splice(hashIndex)[0].split('=')[1];
    if (!hash || hash.length === 0) {
      throw new UnauthorizedException();
    }

    arr.sort((a, b) => a.localeCompare(b));

    return { hash, dataCheckString: arr.join('\n') };
  }

  private generateSecretKey() {
    return createHmac('sha256', 'WebAppData').update(this.telegramBotToken);
  }
}
