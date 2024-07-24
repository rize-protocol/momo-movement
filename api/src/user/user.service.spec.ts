import { INestApplication } from '@nestjs/common';
import { TestingModuleBuilder } from '@nestjs/testing/testing-module.builder';

import { CommonModule } from '@/common/common.module';
import { RedisService } from '@/common/services/redis.service';
import { CoreContractModule } from '@/core-contract/core-contract.module';
import { CoreContractService } from '@/core-contract/core-contract.service';
import { TestHelper } from '@/test-utils/helper';
import { TestModule } from '@/test-utils/test.module';
import { TestService } from '@/test-utils/test.service';
import { UserModule } from '@/user/user.module';
import { UserService } from '@/user/user.service';

describe('userService test', () => {
  let app: INestApplication;

  let testService: TestService;
  let userService: UserService;
  let redisService: RedisService;

  const resourceAddress = 'testReAddr';
  const modifier = (modules: TestingModuleBuilder): TestingModuleBuilder => {
    modules.overrideProvider(CoreContractService).useValue({
      tryGetUserResourceAccount: jest.fn(() => Promise.resolve(resourceAddress)),
    });
    return modules;
  };

  beforeAll(async () => {
    const res = await TestHelper.build(
      {
        imports: [CommonModule, TestModule, UserModule, CoreContractModule],
      },
      modifier,
    );

    app = res.app;

    testService = app.get<TestService>(TestService);
    if (!testService) {
      throw new Error('Failed to initialize TestService');
    }
    userService = app.get<UserService>(UserService);
    if (!userService) {
      throw new Error('Failed to initialize UserService');
    }
    redisService = app.get<RedisService>(RedisService);
    if (!redisService) {
      throw new Error('Failed to initialize RedisService');
    }

    await testService.clear();
    await redisService.flushdb();
  });

  afterAll(async () => {
    await app.close();
  });

  it('create user', async () => {
    const telegramId = testService.generateTelegramId();
    await userService.createUser(telegramId, testService.entityManager);
    await expect(userService.createUser(telegramId, testService.entityManager)).rejects.toThrow('user exist!');
    await expect(userService.mustGetUserByTelegramId(telegramId, testService.entityManager)).rejects.toThrow(
      'user resource address not exist',
    );

    await userService.upsertUserByTelegramId(telegramId, testService.entityManager);
    const user = await userService.mustGetUserByTelegramId(telegramId, testService.entityManager);
    expect(user.resourceAddress).toEqual(resourceAddress);
  });
});
