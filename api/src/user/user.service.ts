import { StandardUnit } from '@aws-sdk/client-cloudwatch';
import { MetricDatum } from '@aws-sdk/client-cloudwatch/dist-types/models/models_0';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectEntityManager } from '@nestjs/typeorm';
import { SHA224 } from 'crypto-js';
import { User } from 'movement-gaming-model';
import { nanoid } from 'nanoid';
import { EntityManager, Not } from 'typeorm';

import { CampaignService } from '@/campaign/campaign.service';
import { CommandService } from '@/command/command.service';
import { MetricsService } from '@/common/services/metrics.service';
import { RedisService } from '@/common/services/redis.service';
import { checkBadRequest } from '@/common/utils/check';
import { CoreContractService } from '@/core-contract/core-contract.service';
import { GameService } from '@/game/game.service';
import { InvitationService } from '@/invitation/invitation.service';

@Injectable()
export class UserService implements OnModuleInit {
  private totalUser: number;

  private readonly redisLockTime = 10000; // 10s

  private readonly logger = new Logger(User.name);

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly invitationService: InvitationService,
    private readonly gameService: GameService,
    private readonly coreContractService: CoreContractService,
    private readonly commandService: CommandService,
    private readonly campaignService: CampaignService,
    private readonly redisService: RedisService,
    private readonly metricsService: MetricsService,
  ) {}

  async onModuleInit() {
    await this.userMonitoring();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async userMonitoring() {
    this.totalUser = await this.entityManager.count(User);
    const totalUserWithResourceAddress = await this.entityManager.countBy(User, { resourceAddress: Not('') });

    const metrics: MetricDatum[] = [
      this.metricsService.createMetricData('totalUser', this.totalUser, StandardUnit.None),
      this.metricsService.createMetricData(
        'totalUserWithResourceAddress',
        totalUserWithResourceAddress,
        StandardUnit.None,
      ),
    ];
    await this.metricsService.putMetrics(metrics);
  }

  async getTotalUser() {
    return this.totalUser ?? 0;
  }

  async upsertUserByTelegramId(telegramId: string, entityManager: EntityManager) {
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

  async mustGetUserByTelegramId(telegramId: string, entityManager: EntityManager) {
    const user = await this.tryGetUserByTelegramId(telegramId, entityManager);
    checkBadRequest(!!user, 'user not exist');
    checkBadRequest(!!user!.resourceAddress, 'user resource address not exist');
    return user!;
  }

  async tryGetUserByTelegramId(telegramId: string, entityManager: EntityManager) {
    return entityManager.findOneBy(User, { telegramId });
  }

  async createUserInternal(telegramId: string, referralCode: string, entityManager: EntityManager) {
    return this.createUser(telegramId, referralCode, entityManager);
  }

  async createUser(telegramId: string, referralCode: string, entityManager: EntityManager) {
    const accountHash = this.generateUserAccountHash(telegramId);
    const existResourceAccount = await this.coreContractService.tryGetUserResourceAccount(accountHash);
    if (existResourceAccount) {
      this.logger.log(
        `[createUser] user exist, telegramId: ${telegramId}, accountHash: ${accountHash}, referralCode: ${referralCode}`,
      );
      return;
    }
    const isReferralCampaignCode =
      referralCode.length > 0 ? await this.campaignService.isReferralCampaignCode(referralCode, entityManager) : false;

    const redisLock = await this.redisService.acquireLock(`momo-create-user-${telegramId}`, this.redisLockTime);
    try {
      if (isReferralCampaignCode) {
        const uniId = nanoid();
        await this.commandService.addCreateResourceAccountAndMintToken(
          accountHash,
          uniId,
          this.campaignService.getReferralCoinAmount().toString(),
        );
      } else {
        await this.commandService.addCreateResourceAccount(accountHash);
      }

      const exit = await entityManager.findOneBy(User, { telegramId });
      if (exit) {
        return;
      }

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

  private generateUserAccountHash(telegramId: string) {
    const rawData = { type: 'telegram', telegramId };
    const encodedData = JSON.stringify(rawData);
    return SHA224(encodedData).toString();
  }
}
