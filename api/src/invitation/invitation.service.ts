import { StandardUnit } from '@aws-sdk/client-cloudwatch';
import { MetricDatum } from '@aws-sdk/client-cloudwatch/dist-types/models/models_0';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Invitation, InvitationClaimHistory, InvitationCode, InvitationRelation, User } from 'movement-gaming-model';
import { nanoid } from 'nanoid';
import { EntityManager } from 'typeorm';

import { InvitationConfig, InvitationTargetConfig } from '@/common/config/types';
import { MetricsService } from '@/common/services/metrics.service';
import { RedisService } from '@/common/services/redis.service';
import { checkBadRequest } from '@/common/utils/check';
import { GameService } from '@/game/game.service';
import { UserInvitationInfo } from '@/invitation/types';
import { MomoService } from '@/momo/momo.service';

@Injectable()
export class InvitationService {
  private readonly invitationConfig: InvitationConfig;

  private readonly invitationTarget: Record<number, InvitationTargetConfig>;

  private readonly redisLockTime = 10000; // 10s

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly configService: ConfigService,
    private readonly momoService: MomoService,
    private readonly gameService: GameService,
    private readonly redisService: RedisService,
    private readonly metricsService: MetricsService,
  ) {
    const invitationConfig = this.configService.get<InvitationConfig>('invitation');
    if (!invitationConfig) {
      throw new Error('invitation config not found');
    }

    this.invitationConfig = invitationConfig;
    this.invitationTarget = invitationConfig.target;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async invitationMonitoring() {
    const totalInvitee = await this.entityManager.count(InvitationRelation);
    const totalInviterList = await this.entityManager
      .createQueryBuilder()
      .from('invitation_relation', 'invitation_relation')
      .select('invitation_relation.inviterId', 'inviterId')
      .addSelect('COUNT(invitation_relation.inviterId)', 'count')
      .groupBy('inviterId')
      .having('count >= :count', { count: 20 })
      .getRawMany();
    const totalInviter = totalInviterList.length;

    const metrics: MetricDatum[] = [
      this.metricsService.createMetricData('totalInvitee', totalInvitee, StandardUnit.None),
      this.metricsService.createMetricData('totalInviter', totalInviter, StandardUnit.None),
    ];
    await this.metricsService.putMetrics(metrics);
  }

  async getUserInvitationInfo(user: User, entityManager: EntityManager): Promise<UserInvitationInfo> {
    const invitationCode = await this.getUserInvitationCode(user, entityManager);
    const invitationInfo = await this.mustGetUserInvitation(user.id!, entityManager);

    const targetLevel = this.getLevel(invitationInfo.checkedLevel);
    const uncheckedRewards = this.getUncheckedRewards(invitationInfo);
    return {
      invitationCode,
      targetReferralNums: targetLevel.memberNums,
      currentReferralNums: invitationInfo.inviteCount,
      uncheckedRewards,
      checkedLevel: invitationInfo.checkedLevel,
      uncheckedLevel: invitationInfo.unCheckedLevel,
    };
  }

  async addReferralBinding(referralCode: string, inviteeId: number, entityManager: EntityManager) {
    const referralUserId = await this.mustGetReferralUserId(referralCode, entityManager);
    const userInvitation = await this.mustGetUserInvitation(referralUserId, entityManager);

    userInvitation.inviteCount++;
    const unCheckedLevel = this.findTargetLevel(userInvitation.inviteCount);
    if (unCheckedLevel > userInvitation.unCheckedLevel) {
      userInvitation.unCheckedLevel = unCheckedLevel;
    }

    await entityManager.save(userInvitation);

    await entityManager.insert(InvitationRelation, {
      inviterId: referralUserId,
      inviteeId,
    });
  }

  async claimRewards(user: User, entityManager: EntityManager) {
    const redisLock = await this.redisService.acquireLock(`momo-claim-invitation-${user.id!}`, this.redisLockTime);
    try {
      const invitationInfo = await this.mustGetUserInvitation(user.id!, entityManager);
      const { rewardCoins, rewardPlays } = this.getUncheckedRewards(invitationInfo);

      let uniId = '';
      if (rewardCoins > 0) {
        uniId = nanoid();

        await this.momoService.referralBonus({
          user,
          uniId,
          momoChange: rewardCoins.toString(),
        });
      }
      if (rewardPlays > 0) {
        await this.gameService.addExtraPlay(user, rewardPlays, entityManager);
      }

      const levelInfo = { checkedLevel: invitationInfo.checkedLevel, uncheckedLevel: invitationInfo.unCheckedLevel };
      const history: InvitationClaimHistory = {
        userId: user.id!,
        telegramId: user.telegramId,
        uniId,
        coinAmount: rewardCoins.toString(),
        playAmount: rewardPlays,
        extra: JSON.stringify(levelInfo),
      };
      await entityManager.insert(InvitationClaimHistory, history);

      invitationInfo.checkedLevel = invitationInfo.unCheckedLevel;
      await entityManager.save(invitationInfo);

      return { uniId, rewardCoins, rewardPlays };
    } finally {
      await redisLock.release();
    }
  }

  getLevel(level: number): InvitationTargetConfig {
    if (this.invitationTarget[level]) {
      return this.invitationTarget[level];
    }

    const maxExistLevelInfo = this.invitationTarget[Object.keys(this.invitationTarget).length - 1];
    const maxExistLevel = maxExistLevelInfo.level;

    const levelGap = level - maxExistLevel;
    return {
      level,
      memberNums: maxExistLevelInfo.memberNums + levelGap * this.invitationConfig.targetMemberNumsStep,
      rewardCoins: maxExistLevelInfo.rewardCoins + levelGap * this.invitationConfig.targetRewardCoinsStep,
      rewardPlays: maxExistLevelInfo.rewardPlays + levelGap * this.invitationConfig.targetRewardPlaysStep,
    };
  }

  async isValidInvitationCode(code: string, entityManager: EntityManager) {
    if (!!code && code.length === this.invitationConfig.codeLen) {
      return entityManager.existsBy(InvitationCode, { code });
    }
    return false;
  }

  async initInvitation(user: User, entityManager: EntityManager) {
    // init invitation info
    const invitationInfo: Invitation = {
      userId: user.id!,
      inviteCount: 0,
      checkedLevel: 0,
      unCheckedLevel: 0,
    };
    await entityManager.insert(Invitation, invitationInfo);

    // init invitation code
    const code = await this.generateUnique(entityManager);
    checkBadRequest(!!code, 'generate invitation code failed');
    await entityManager.insert(InvitationCode, { userId: user.id!, code: code! });
  }

  private getUncheckedRewards(invitationInfo: Invitation) {
    let rewardCoins = 0;
    let rewardPlays = 0;
    let currentLevel = invitationInfo.checkedLevel;
    while (currentLevel < invitationInfo.unCheckedLevel) {
      currentLevel++;
      const levelInfo = this.getLevel(currentLevel);

      rewardCoins += levelInfo.rewardCoins;
      rewardPlays += levelInfo.rewardPlays;
    }

    return { rewardCoins, rewardPlays };
  }

  private async mustGetUserInvitation(userId: number, entityManager: EntityManager) {
    const userInvitation = await entityManager.findOneBy(Invitation, { userId });
    checkBadRequest(!!userInvitation, `user: ${userId} invitation not found`);
    return userInvitation!;
  }

  private async getUserInvitationCode(user: User, entityManager: EntityManager) {
    const exist = await entityManager.findOneBy(InvitationCode, { userId: user.id! });
    checkBadRequest(!!exist, 'invitation code not exist');
    return exist!.code;
  }

  private findTargetLevel(inviteCount: number) {
    let level = 0;
    while (true) {
      const levelInfo = this.getLevel(level);
      if (levelInfo.memberNums > inviteCount) {
        break;
      }
      level++;
    }
    return level;
  }

  private async mustGetReferralUserId(referralCode: string, entityManager: EntityManager) {
    const exist = await entityManager.findOneBy(InvitationCode, { code: referralCode });
    checkBadRequest(!!exist, 'referral code not exist');

    return exist!.userId;
  }

  private async generateUnique(entityManger: EntityManager) {
    let tryTime = 0;
    while (tryTime < this.invitationConfig.maxGenerateCodeTryTimes) {
      const code = this.generateCode();
      const exist = await entityManger.findOneBy(InvitationCode, { code });
      if (!exist) {
        return code;
      }
      tryTime++;
    }
    return undefined;
  }

  private generateCode() {
    return Math.random()
      .toString(36)
      .substring(2, this.invitationConfig.codeLen + 2)
      .toUpperCase();
  }
}
