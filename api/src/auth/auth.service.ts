import { createHmac } from 'crypto';

import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { AdminConfig, TelegramConfig } from '@/common/config/types';
import { SecretManagerService } from '@/common/services/secret-manager.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private telegramBotToken: string;

  private adminAuthToken: string;

  constructor(
    private readonly configService: ConfigService,
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

    const authConfig = this.configService.get<AdminConfig>('admin');
    if (!authConfig) {
      throw new Error('admin config not found');
    }
    const authToken = await this.secretManagerService.getConfigValue(authConfig.authToken);
    if (!authToken) {
      throw new Error('invalid admin auto token');
    }
    this.adminAuthToken = authToken;
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

  isAdmin(request: Request) {
    const adminAuthToken = request.headers['admin-auth-token'] as string;
    return adminAuthToken === this.adminAuthToken;
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
