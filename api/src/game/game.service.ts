import { StandardUnit } from '@aws-sdk/client-cloudwatch';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectEntityManager } from '@nestjs/typeorm';
import { GamePlay, GamePlayHistory, User } from 'movement-gaming-model';
import { nanoid } from 'nanoid';
import { EntityManager } from 'typeorm';

import { GameConfig } from '@/common/config/types';
import { MetricsService } from '@/common/services/metrics.service';
import { RedisService } from '@/common/services/redis.service';
import { TimeService } from '@/common/services/time.service';
import { checkBadRequest } from '@/common/utils/check';
import { GamePlayInfo } from '@/game/types';
import { MomoService } from '@/momo/momo.service';

@Injectable()
export class GameService {
  private readonly totalPlay: number;

  private readonly replenishmentInterval: number;

  private readonly redisLockTime = 10000; // 10s

  private readonly coinsPerGame: number;

  private readonly timesPerGame: number;

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly timeService: TimeService,
    private readonly momoService: MomoService,
    private readonly metricsService: MetricsService,
  ) {
    const gameConfig = this.configService.get<GameConfig>('game');
    if (!gameConfig) {
      throw new Error('game config not found');
    }

    this.totalPlay = gameConfig.totalPlay;
    this.replenishmentInterval = gameConfig.replenishmentInterval;
    this.coinsPerGame = gameConfig.coinsPerGame;
    this.timesPerGame = gameConfig.timesPerGame;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async gameMonitoring() {
    const totalGamePlay = await this.entityManager.count(GamePlayHistory);
    await this.metricsService.putMetrics([
      this.metricsService.createMetricData('totalGamePlay', totalGamePlay, StandardUnit.None),
    ]);
  }

  async getPlayInfo(user: User, entityManager: EntityManager): Promise<GamePlayInfo> {
    const gamePlay = await this.refreshGamePlay(user, entityManager);

    const totalReplenishmentTime = (gamePlay.totalPlays - gamePlay.remainingPlays) * this.replenishmentInterval;
    const now = this.timeService.getCurrentSecondPrecisionTime();
    const timeGap = Math.floor((now.getTime() - gamePlay.lastReplenishmentTime.getTime()) / 1000);
    const replenishmentIn = totalReplenishmentTime === 0 ? totalReplenishmentTime : totalReplenishmentTime - timeGap;

    return {
      total: gamePlay.totalPlays + gamePlay.extraPlays,
      remaining: gamePlay.remainingPlays + gamePlay.extraPlays,
      replenishmentIn,
      lastReplenishmentTime: gamePlay.lastReplenishmentTime,
    };
  }

  async play(user: User, entityManager: EntityManager) {
    const redisLock = await this.redisService.acquireLock(`momo-play-${user.id!}`, this.redisLockTime);
    try {
      const gamePlay = await this.refreshGamePlay(user, entityManager);
      checkBadRequest(gamePlay.remainingPlays > 0 || gamePlay.extraPlays > 0, 'user remaining play is 0');

      // save GamePlay
      if (gamePlay.extraPlays > 0) {
        gamePlay.extraPlays--;
      } else {
        if (gamePlay.remainingPlays === this.totalPlay) {
          gamePlay.lastReplenishmentTime = this.timeService.getCurrentSecondPrecisionTime();
        }
        gamePlay.remainingPlays--;
      }
      await entityManager.save(GamePlay, gamePlay);

      const uniIds: string[] = [];
      for (let i = 0; i < this.timesPerGame; i++) {
        const uniId = nanoid();
        // mint momo
        await this.momoService.mintMomo({
          user,
          uniId,
          momoChange: this.coinsPerGame.toString(),
        });
        uniIds.push(uniId);
      }

      // save GameHistory
      const history: GamePlayHistory = {
        userId: user.id!,
        telegramId: user.telegramId,
        uniIds: JSON.stringify(uniIds),
        coinAmount: (this.coinsPerGame * this.timesPerGame).toString(),
      };
      await entityManager.insert(GamePlayHistory, history);

      return uniIds;
    } finally {
      await redisLock.release();
    }
  }

  async addExtraPlay(user: User, extraCount: number, entityManager: EntityManager) {
    const gamePlay = await this.mustGetGamePlay(user.id!, entityManager);
    gamePlay.extraPlays += extraCount;
    await entityManager.save(gamePlay);
  }

  async initPlay(user: User, entityManager: EntityManager) {
    const gamePlay: GamePlay = {
      userId: user.id!,
      telegramId: user.telegramId,
      totalPlays: this.totalPlay,
      remainingPlays: this.totalPlay,
      extraPlays: 0,
      lastReplenishmentTime: this.timeService.getCurrentSecondPrecisionTime(),
    };
    await entityManager.insert(GamePlay, gamePlay);
  }

  private async refreshGamePlay(user: User, entityManager: EntityManager) {
    const gamePlay = await this.mustGetGamePlay(user.id!, entityManager);

    // if totalPlays === remainingPlays, return directly.
    if (gamePlay.totalPlays === gamePlay.remainingPlays) {
      return gamePlay;
    }

    const now = this.timeService.getCurrentSecondPrecisionTime();
    const timeDiff = (now.getTime() - gamePlay.lastReplenishmentTime.getTime()) / 1000;

    const repPlay = Math.floor(timeDiff / this.replenishmentInterval);
    const addedPlay = gamePlay.remainingPlays + repPlay;

    gamePlay.remainingPlays = addedPlay >= this.totalPlay ? this.totalPlay : addedPlay;
    gamePlay.lastReplenishmentTime =
      addedPlay >= this.totalPlay
        ? now
        : new Date(gamePlay.lastReplenishmentTime.getTime() + repPlay * this.replenishmentInterval * 1000);

    await entityManager.save(GamePlay, gamePlay);

    return gamePlay;
  }

  private async mustGetGamePlay(userId: number, entityManager: EntityManager) {
    const existGamePlay = await entityManager.findOneBy(GamePlay, { userId });
    checkBadRequest(!!existGamePlay, 'user game play not found');
    return existGamePlay!;
  }
}
