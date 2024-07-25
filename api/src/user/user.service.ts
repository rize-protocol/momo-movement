import { Injectable } from '@nestjs/common';
import { SHA224 } from 'crypto-js';
import { User } from 'movement-gaming-model';
import { EntityManager } from 'typeorm';

import { CommandService } from '@/command/command.service';
import { RedisService } from '@/common/services/redis.service';
import { checkBadRequest } from '@/common/utils/check';
import { CoreContractService } from '@/core-contract/core-contract.service';
import { GameService } from '@/game/game.service';
import { InvitationService } from '@/invitation/invitation.service';

@Injectable()
export class UserService {
  private readonly redisLockTime = 10000; // 10s

  constructor(
    private readonly invitationService: InvitationService,
    private readonly gameService: GameService,
    private readonly coreContractService: CoreContractService,
    private readonly commandService: CommandService,
    private readonly redisService: RedisService,
  ) {}

  async upsertUserByTelegramId(telegramId: number, entityManager: EntityManager) {
    const user = await this.tryGetUserByTelegramId(telegramId, entityManager);

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
    const user = await this.tryGetUserByTelegramId(telegramId, entityManager);
    checkBadRequest(!!user, 'user not exist');
    checkBadRequest(!!user!.resourceAddress, 'user resource address not exist');
    return user!;
  }

  async tryGetUserByTelegramId(telegramId: number, entityManager: EntityManager) {
    return entityManager.findOneBy(User, { telegramId });
  }

  async createUser(telegramId: number, referralCode: string, entityManager: EntityManager) {
    const redisLock = await this.redisService.acquireLock(`momo-create-user-${telegramId}`, this.redisLockTime);
    try {
      const exit = await entityManager.findOneBy(User, { telegramId });
      checkBadRequest(!exit, 'user exist!');

      const accountHash = this.generateUserAccountHash(telegramId);
      await this.commandService.addCreateResourceAccount(accountHash);

      const user: User = {
        telegramId,
        accountHash: this.generateUserAccountHash(telegramId),
        resourceAddress: '',
      };
      const res = await entityManager.insert(User, user);
      const userId = res.identifiers[0].id as number;

      // init user game
      await this.gameService.initPlay(user, entityManager);

      // init invitation
      await this.invitationService.initInvitation(user, entityManager);

      if (referralCode.length > 0) {
        await this.invitationService.addReferralBinding(referralCode, userId, entityManager);
      }
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
