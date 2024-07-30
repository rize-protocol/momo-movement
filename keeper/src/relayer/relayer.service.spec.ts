import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';

import { CommonModule } from '@/common/common.module';
import { RelayerConfig } from '@/common/config/types';
import { RedisService } from '@/common/services/redis.service';
import { TimeService } from '@/common/services/time.service';
import { CoreContractModule } from '@/core-contract/core-contract.module';
import { CoreContractService } from '@/core-contract/core-contract.service';
import { RelayerModule } from '@/relayer/relayer.module';
import { Command } from '@/relayer/types';
import { TestHelper } from '@/test-utils/helper';
import { TestModule } from '@/test-utils/test.module';
import { TestService } from '@/test-utils/test.service';
import { WalletModule } from '@/wallet/wallet.module';

describe('relayerService test', () => {
  let app: INestApplication;

  let testService: TestService;
  let coreContractService: CoreContractService;
  let redisService: RedisService;
  let timeService: TimeService;
  let commandAccountRedisKey: string;
  let commandTokenRedisKey: string;

  beforeAll(async () => {
    const res = await TestHelper.build({
      imports: [CommonModule, TestModule, CoreContractModule, WalletModule, RelayerModule],
    });

    app = res.app;

    testService = app.get<TestService>(TestService);
    if (!testService) {
      throw new Error('Failed to initialize TestService');
    }
    coreContractService = app.get<CoreContractService>(CoreContractService);
    if (!coreContractService) {
      throw new Error('Failed to initialize CoreContractService');
    }
    redisService = app.get<RedisService>(RedisService);
    if (!redisService) {
      throw new Error('Failed to initialize RedisService');
    }
    timeService = app.get<TimeService>(TimeService);
    if (!timeService) {
      throw new Error('Failed to initialize TimeService');
    }

    const configService = app.get<ConfigService>(ConfigService);
    if (!configService) {
      throw new Error('Failed to initialize ConfigService');
    }
    const relayerConfig = configService.get<RelayerConfig>('relayer');
    if (!relayerConfig) {
      throw new Error('relayer config not found');
    }
    commandAccountRedisKey = relayerConfig.commandAccountRedisKey;
    commandTokenRedisKey = relayerConfig.commandTokenRedisKey;
  });

  afterAll(async () => {
    await app.close();
  });

  it('create resource account command', async () => {
    const userAccountHash = new Date().getTime().toString();
    console.log(`userAccountHash: ${userAccountHash}`);

    const resourceAccountBefore = await coreContractService.tryGetUserResourceAccount(userAccountHash);
    expect(resourceAccountBefore).toBeUndefined();

    const command: Command = { type: 'create_resource_account', userAccountHash };
    redisService.rpush(commandAccountRedisKey, JSON.stringify(command));

    await timeService.sleep(5000); // sleep 5s

    const resourceAccount = await coreContractService.tryGetUserResourceAccount(userAccountHash);
    expect(resourceAccount).toBeDefined();
    console.log(`resourceAccount: ${resourceAccount}`);

    redisService.rpush(commandAccountRedisKey, JSON.stringify(command));
    await timeService.sleep(5000); // sleep 5s
  });

  it('create and mint/transfer token', async () => {
    const userAccountHash1 = new Date().getTime().toString();
    console.log(`userAccountHash1: ${userAccountHash1}`);
    const resourceAccountBefore1 = await coreContractService.tryGetUserResourceAccount(userAccountHash1);
    expect(resourceAccountBefore1).toBeUndefined();

    const userAccountHash2 = new Date().getTime().toString();
    console.log(`userAccountHash2: ${userAccountHash2}`);
    const resourceAccountBefore2 = await coreContractService.tryGetUserResourceAccount(userAccountHash2);
    expect(resourceAccountBefore2).toBeUndefined();

    const command1: Command = { type: 'create_resource_account', userAccountHash: userAccountHash1 };
    const command2: Command = { type: 'create_resource_account', userAccountHash: userAccountHash2 };
    redisService.rpush(commandAccountRedisKey, JSON.stringify(command1), JSON.stringify(command2));

    await timeService.sleep(8000); // sleep 10s

    const resourceAccount1 = await coreContractService.tryGetUserResourceAccount(userAccountHash1);
    expect(resourceAccount1).toBeDefined();
    console.log(`resourceAccount1: ${resourceAccount1}`);

    const resourceAccount2 = await coreContractService.tryGetUserResourceAccount(userAccountHash2);
    expect(resourceAccount2).toBeDefined();
    console.log(`resourceAccount2: ${resourceAccount2}`);

    const mintAmount1 = '100';
    const mintAmount2 = '50';
    const command3: Command = { type: 'mint_token', receipt: resourceAccount1!, uniId: nanoid(), amount: mintAmount1 };
    const command4: Command = { type: 'mint_token', receipt: resourceAccount2!, uniId: nanoid(), amount: mintAmount2 };
    redisService.rpush(commandTokenRedisKey, JSON.stringify(command3), JSON.stringify(command4));

    await timeService.sleep(8000); // sleep 10s

    const balance1 = await coreContractService.momoBalance(resourceAccount1!);
    const balance2 = await coreContractService.momoBalance(resourceAccount2!);
    expect(balance1.isEqualTo(mintAmount1)).toBeTruthy();
    expect(balance2.isEqualTo(mintAmount2)).toBeTruthy();
  });
});
