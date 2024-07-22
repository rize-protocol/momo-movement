import { Injectable } from '@nestjs/common';
import { User } from 'movement-gaming-model';
import { EntityManager } from 'typeorm';

import { RedisService } from '@/common/services/redis.service';
import { checkBadRequest } from '@/common/utils/check';

@Injectable()
export class UserService {
  private readonly redisLockTime = 10000; // 10s

  constructor(private readonly redisService: RedisService) {}

  async getUserByTelegramId(telegramId: number, entityManager: EntityManager) {
    return entityManager.findOneBy(User, { telegramId });
  }

  async createUser(telegramId: number, entityManager: EntityManager) {
    const redisLock = await this.redisService.acquireLock(`create-user-${telegramId}`, this.redisLockTime);
    try {
      const exit = await this.getUserByTelegramId(telegramId, entityManager);
      checkBadRequest(!exit, 'user exist!');

      const user: User = {
        telegramId,
        accountHash: 'hash',
        resourceAddress: 'resource',
        evmAddress: 'evm',
      };
      await entityManager.insert(User, user);
    } finally {
      await redisLock.release();
    }
  }
}
