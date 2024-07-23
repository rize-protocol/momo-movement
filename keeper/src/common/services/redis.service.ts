import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import Redlock from 'redlock';

import { RedisConfig } from '@/common/config/types';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private redlock: Redlock;

  constructor(private readonly configService: ConfigService) {
    const cacheConfig = configService.get<RedisConfig>('redis');
    if (!cacheConfig) {
      throw new Error('Cache config not found');
    }
    super(cacheConfig.port, cacheConfig.host);

    // max wait for 2s before lock throw errors.
    this.redlock = new Redlock([this], {
      retryCount: 10,
      retryDelay: 200,
    });
  }

  async onModuleDestroy() {
    super.disconnect();
  }

  async acquireLock(uniqId: string, duration: number) {
    return this.redlock.acquire([uniqId], duration);
  }
}
