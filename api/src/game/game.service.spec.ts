import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CommonModule } from '@/common/common.module';
import { GameConfig } from '@/common/config/types';
import { RedisService } from '@/common/services/redis.service';
import { TimeService } from '@/common/services/time.service';
import { GameModule } from '@/game/game.module';
import { GameService } from '@/game/game.service';
import { TestHelper } from '@/test-utils/helper';
import { TestModule } from '@/test-utils/test.module';
import { TestService } from '@/test-utils/test.service';

describe('GameService Test', () => {
  let app: INestApplication;

  let testService: TestService;
  let gameService: GameService;
  let timeService: TimeService;
  let redisService: RedisService;

  let gamePlayConfig: GameConfig;

  beforeAll(async () => {
    const res = await TestHelper.build({
      imports: [CommonModule, TestModule, GameModule],
    });

    app = res.app;

    testService = app.get<TestService>(TestService);
    if (!testService) {
      throw new Error('Failed to initialize TestService');
    }
    gameService = app.get<GameService>(GameService);
    if (!gameService) {
      throw new Error('Failed to initialize GameService');
    }
    timeService = app.get<TimeService>(TimeService);
    if (!timeService) {
      throw new Error('Failed to initialize TimeService');
    }
    redisService = app.get<RedisService>(RedisService);
    if (!redisService) {
      throw new Error('Failed to initialize RedisService');
    }

    const configService = app.get<ConfigService>(ConfigService);
    if (!configService) {
      throw new Error('Failed to initialize ConfigService');
    }
    gamePlayConfig = configService.get<GameConfig>('game')!;

    await testService.clear();
    await redisService.flushdb();
  });

  afterAll(async () => {
    await app.close();
  });

  it('init game play', async () => {
    const telegramId = testService.generateTelegramId();
    const user = await testService.tryCreateUser(telegramId);

    const gamePlay = await gameService.getPlayInfo(user, testService.entityManager);
    expect(gamePlay.total).toEqual(gamePlayConfig.totalPlay);
    expect(gamePlay.remaining).toEqual(gamePlayConfig.totalPlay);
  });

  it('play game', async () => {
    const telegramId = testService.generateTelegramId();
    const user = await testService.tryCreateUser(telegramId);

    const initCurrentTime = 1721802100 * 1000;
    jest.spyOn(timeService, 'getCurrentSecondPrecisionTime').mockImplementation(() => new Date(initCurrentTime));
    await gameService.play(user, testService.entityManager);
    let gamePlay = await gameService.getPlayInfo(user, testService.entityManager);
    expect(gamePlay.remaining).toEqual(gamePlayConfig.totalPlay - 1);
    expect(gamePlay.replenishmentIn).toEqual(gamePlayConfig.replenishmentInterval);
    expect(gamePlay.lastReplenishmentTime.getTime()).toEqual(initCurrentTime);

    let currentTime = 1721802102 * 1000;
    jest.spyOn(timeService, 'getCurrentSecondPrecisionTime').mockImplementation(() => new Date(currentTime));
    await gameService.play(user, testService.entityManager);
    gamePlay = await gameService.getPlayInfo(user, testService.entityManager);
    expect(gamePlay.remaining).toEqual(gamePlayConfig.totalPlay - 2);
    expect(gamePlay.replenishmentIn).toEqual(gamePlayConfig.replenishmentInterval * 2 - 2);
    expect(gamePlay.lastReplenishmentTime.getTime()).toEqual(initCurrentTime);

    currentTime = 1721802104 * 1000;
    jest.spyOn(timeService, 'getCurrentSecondPrecisionTime').mockImplementation(() => new Date(currentTime));
    await gameService.play(user, testService.entityManager);
    gamePlay = await gameService.getPlayInfo(user, testService.entityManager);
    expect(gamePlay.remaining).toEqual(gamePlayConfig.totalPlay - 3);
    expect(gamePlay.replenishmentIn).toEqual(gamePlayConfig.replenishmentInterval * 3 - 4);
    expect(gamePlay.lastReplenishmentTime.getTime()).toEqual(initCurrentTime);

    // currentTime - lastReplenishmentTime < replenishmentInterval, will not add remainingPlays
    currentTime = 1721802106 * 1000;
    jest.spyOn(timeService, 'getCurrentSecondPrecisionTime').mockImplementation(() => new Date(currentTime));
    gamePlay = await gameService.getPlayInfo(user, testService.entityManager);
    expect(gamePlay.remaining).toEqual(gamePlayConfig.totalPlay - 3);
    expect(gamePlay.replenishmentIn).toEqual(gamePlayConfig.replenishmentInterval * 3 - 6);
    expect(gamePlay.lastReplenishmentTime.getTime()).toEqual(initCurrentTime);

    // currentTime - lastReplenishmentTime = replenishmentInterval, will add remainingPlays
    currentTime = 1721802110 * 1000;
    jest.spyOn(timeService, 'getCurrentSecondPrecisionTime').mockImplementation(() => new Date(currentTime));
    gamePlay = await gameService.getPlayInfo(user, testService.entityManager);
    expect(gamePlay.remaining).toEqual(gamePlayConfig.totalPlay - 2);
    expect(gamePlay.replenishmentIn).toEqual(gamePlayConfig.replenishmentInterval * 2);
    expect(gamePlay.lastReplenishmentTime.getTime()).toEqual(
      initCurrentTime + gamePlayConfig.replenishmentInterval * 1000,
    );

    // currentTime - lastReplenishmentTime > 2 *replenishmentInterval, will add remainingPlays
    currentTime = 1721802129 * 1000;
    jest.spyOn(timeService, 'getCurrentSecondPrecisionTime').mockImplementation(() => new Date(currentTime));
    await gameService.play(user, testService.entityManager);
    gamePlay = await gameService.getPlayInfo(user, testService.entityManager);
    expect(gamePlay.remaining).toEqual(gamePlayConfig.totalPlay - 2);
    expect(gamePlay.replenishmentIn).toEqual(gamePlayConfig.replenishmentInterval * 2 - 9);
    expect(gamePlay.lastReplenishmentTime.getTime()).toEqual(
      initCurrentTime + gamePlayConfig.replenishmentInterval * 2 * 1000,
    );

    // currentTime - lastReplenishmentTime > 3 *replenishmentInterval, will add remainingPlays
    currentTime = 1721802190 * 1000;
    jest.spyOn(timeService, 'getCurrentSecondPrecisionTime').mockImplementation(() => new Date(currentTime));
    gamePlay = await gameService.getPlayInfo(user, testService.entityManager);
    expect(gamePlay.remaining).toEqual(gamePlayConfig.totalPlay);
    expect(gamePlay.replenishmentIn).toEqual(0);
    expect(gamePlay.lastReplenishmentTime.getTime()).toEqual(currentTime);
  });
});
