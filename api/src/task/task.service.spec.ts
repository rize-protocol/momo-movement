import { INestApplication } from '@nestjs/common';
import { TestingModuleBuilder } from '@nestjs/testing/testing-module.builder';
import BigNumber from 'bignumber.js';

import { CommonModule } from '@/common/common.module';
import { RedisService } from '@/common/services/redis.service';
import { CoreContractModule } from '@/core-contract/core-contract.module';
import { CoreContractService } from '@/core-contract/core-contract.service';
import { OverviewModule } from '@/overview/overview.module';
import { OverviewService } from '@/overview/overview.service';
import { TaskModule } from '@/task/task.module';
import { TaskService } from '@/task/task.service';
import { TestHelper } from '@/test-utils/helper';
import { TestModule } from '@/test-utils/test.module';
import { TestService } from '@/test-utils/test.service';

describe('taskService test', () => {
  let app: INestApplication;

  let testService: TestService;
  let taskService: TaskService;
  let redisService: RedisService;
  let overviewService: OverviewService;

  const modifier = (modules: TestingModuleBuilder): TestingModuleBuilder => {
    modules.overrideProvider(CoreContractService).useValue({
      momoBalance: jest.fn(() => Promise.resolve(new BigNumber(888))),
    });
    return modules;
  };

  beforeAll(async () => {
    const res = await TestHelper.build(
      {
        imports: [CommonModule, TestModule, TaskModule, OverviewModule, CoreContractModule],
      },
      modifier,
    );

    app = res.app;

    testService = app.get<TestService>(TestService);
    if (!testService) {
      throw new Error('Failed to initialize TestService');
    }
    taskService = app.get<TaskService>(TaskService);
    if (!taskService) {
      throw new Error('Failed to initialize TaskService');
    }
    redisService = app.get<RedisService>(RedisService);
    if (!redisService) {
      throw new Error('Failed to initialize RedisService');
    }
    overviewService = app.get<OverviewService>(OverviewService);
    if (!overviewService) {
      throw new Error('Failed to initialize OverviewService');
    }

    await testService.clear();
    await redisService.flushdb();
  });

  afterAll(async () => {
    await app.close();
  });

  it('complete task', async () => {
    const telegramId = testService.generateTelegramId();
    const user = await testService.tryCreateUser(telegramId, '');

    let list = await taskService.list(user, testService.entityManager);
    list.forEach((item) => {
      expect(item.completed).toBeFalsy();
    });

    let info = await overviewService.info(user, testService.entityManager);
    const initTotalPlay = info.game.total;

    await taskService.completeTask(user, 1, testService.entityManager);
    list = await taskService.list(user, testService.entityManager);
    list.forEach((item) => {
      if (item.task.taskId === 1) {
        expect(item.completed).toBeTruthy();
      } else {
        expect(item.completed).toBeFalsy();
      }
    });
    info = await overviewService.info(user, testService.entityManager);
    expect(info.game.total - initTotalPlay).toBe(1);

    await expect(taskService.completeTask(user, 1, testService.entityManager)).rejects.toThrow(
      'user has completed the task',
    );
  });
});
