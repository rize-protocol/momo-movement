import { Injectable } from '@nestjs/common';
import { SHA224 } from 'crypto-js';
import { User } from 'movement-gaming-model';
import { EntityManager } from 'typeorm';

import { CommandService } from '@/command/command.service';
import { RedisService } from '@/common/services/redis.service';
import { checkBadRequest } from '@/common/utils/check';
import { CoreContractService } from '@/core-contract/core-contract.service';

@Injectable()
export class UserService {
  private readonly redisLockTime = 10000; // 10s

  constructor(
    private readonly coreContractService: CoreContractService,
    private readonly commandService: CommandService,
    private readonly redisService: RedisService,
  ) {}

  async upsertUserByTelegramId(telegramId: number, entityManager: EntityManager) {
    const user = await entityManager.findOneBy(User, { telegramId });

    // if user not found, return undefined
    if (!user) {
      return undefined;
    }

    // if resourceAddress is set, return user directly.
    if (user.resourceAddress.length > 0) {
      return user;
    }

    // try fetch resourceAddress
    const resourceAddress = await this.coreContractService.tryGetUserResourceAccount(user.accountHash);
    if (!resourceAddress) {
      return undefined;
    }

    // store resource address
    await entityManager.update(User, { telegramId }, { resourceAddress });

    user.resourceAddress = resourceAddress;
    return user;
  }

  async mustGetUserByTelegramId(telegramId: number, entityManager: EntityManager) {
    const user = await entityManager.findOneBy(User, { telegramId });
    checkBadRequest(!!user, 'user not exist');
    checkBadRequest(!!user!.resourceAddress, 'user resource address not exist');
    return user!;
  }

  async createUser(telegramId: number, entityManager: EntityManager) {
    const redisLock = await this.redisService.acquireLock(`momo-create-user-${telegramId}`, this.redisLockTime);
    try {
      const exit = await entityManager.findOneBy(User, { telegramId });
      checkBadRequest(!exit, 'user exist!');

      const accountHash = this.generateUserAccountHash(telegramId);
      const user: User = {
        telegramId,
        accountHash: this.generateUserAccountHash(telegramId),
        resourceAddress: '',
      };
      await entityManager.insert(User, user);
      await this.commandService.addCreateResourceAccount(accountHash);
    } finally {
      await redisLock.release();
    }
  }

  private generateUserAccountHash(telegramId: number) {
    const rawData = { type: 'telegram', telegramId };
    const encodedData = JSON.stringify(rawData);
    return SHA224(encodedData).toString();
  }
}
