import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GamePlay, User } from 'movement-gaming-model';
import { nanoid } from 'nanoid';
import { EntityManager } from 'typeorm';

import { CommandService } from '@/command/command.service';
import { GameConfig } from '@/common/config/types';
import { RedisService } from '@/common/services/redis.service';
import { TimeService } from '@/common/services/time.service';
import { checkBadRequest } from '@/common/utils/check';
import { GamePlayInfo } from '@/game/types';
import { UserService } from '@/user/user.service';

@Injectable()
export class GameService {
  private readonly totalPlay: number;

  private readonly replenishmentInterval: number;

  private readonly coinsPerGame: string;

  private readonly redisLockTime = 10000; // 10s

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly commandService: CommandService,
    private readonly redisService: RedisService,
    private readonly timeService: TimeService,
  ) {
    const gameConfig = this.configService.get<GameConfig>('game');
    if (!gameConfig) {
      throw new Error('game config not found');
    }

    this.totalPlay = gameConfig.totalPlay;
    this.replenishmentInterval = gameConfig.replenishmentInterval;
    this.coinsPerGame = gameConfig.coinsPerGame;
  }

  async getPlayInfo(user: User, entityManager: EntityManager): Promise<GamePlayInfo> {
    const gamePlay = await this.refreshGamePlay(user, entityManager);

    const totalReplenishmentTime = (gamePlay.totalPlays - gamePlay.remainingPlays) * this.replenishmentInterval;
    const now = this.timeService.getCurrentSecondPrecisionTime();
    const timeGap = Math.floor((now.getTime() - gamePlay.lastReplenishmentTime.getTime()) / 1000);
    const replenishmentIn = totalReplenishmentTime === 0 ? totalReplenishmentTime : totalReplenishmentTime - timeGap;

    return {
      total: gamePlay.totalPlays,
      remaining: gamePlay.remainingPlays,
      replenishmentIn,
      lastReplenishmentTime: gamePlay.lastReplenishmentTime,
    };
  }

  async play(user: User, entityManager: EntityManager) {
    const redisLock = await this.redisService.acquireLock(`momo-play-${user.id!}`, this.redisLockTime);
    try {
      const gamePlay = await this.refreshGamePlay(user, entityManager);
      checkBadRequest(gamePlay.remainingPlays > 0, 'user remaining play is 0');

      const uniId = nanoid();
      await this.commandService.addMintToken(user.resourceAddress, uniId, this.coinsPerGame);

      if (gamePlay.remainingPlays === this.totalPlay) {
        gamePlay.lastReplenishmentTime = this.timeService.getCurrentSecondPrecisionTime();
      }
      gamePlay.remainingPlays -= 1;
      await entityManager.save(GamePlay, gamePlay);

      return uniId;
    } finally {
      await redisLock.release();
    }
  }

  private async refreshGamePlay(user: User, entityManager: EntityManager) {
    const gamePlay = await entityManager.findOneBy(GamePlay, { id: user.id! });
    if (!gamePlay) {
      return this.initPlayInfo(user, entityManager);
    }

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

  private async initPlayInfo(user: User, entityManager: EntityManager) {
    const gamePlay: GamePlay = {
      userId: user.id!,
      telegramId: user.telegramId,
      totalPlays: this.totalPlay,
      remainingPlays: this.totalPlay,
      lastReplenishmentTime: this.timeService.getCurrentSecondPrecisionTime(),
    };
    await entityManager.insert(GamePlay, gamePlay);
    return gamePlay;
  }
}
