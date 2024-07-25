import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TestingModuleBuilder } from '@nestjs/testing/testing-module.builder';
import BigNumber from 'bignumber.js';

import { CommonModule } from '@/common/common.module';
import { InvitationConfig } from '@/common/config/types';
import { RedisService } from '@/common/services/redis.service';
import { CoreContractModule } from '@/core-contract/core-contract.module';
import { CoreContractService } from '@/core-contract/core-contract.service';
import { InvitationModule } from '@/invitation/invitation.module';
import { InvitationService } from '@/invitation/invitation.service';
import { OverviewModule } from '@/overview/overview.module';
import { OverviewService } from '@/overview/overview.service';
import { TestHelper } from '@/test-utils/helper';
import { TestModule } from '@/test-utils/test.module';
import { TestService } from '@/test-utils/test.service';
import { UserModule } from '@/user/user.module';
import { UserService } from '@/user/user.service';

describe('InvitationService test', () => {
  let app: INestApplication;

  let testService: TestService;
  let invitationService: InvitationService;
  let userService: UserService;
  let overviewService: OverviewService;
  let redisService: RedisService;

  let invitationConfig: InvitationConfig;

  const modifier = (modules: TestingModuleBuilder): TestingModuleBuilder => {
    modules.overrideProvider(CoreContractService).useValue({
      momoBalance: jest.fn(() => Promise.resolve(new BigNumber(888))),
    });
    return modules;
  };

  beforeAll(async () => {
    const res = await TestHelper.build(
      {
        imports: [CommonModule, TestModule, InvitationModule, UserModule, OverviewModule, CoreContractModule],
      },
      modifier,
    );

    app = res.app;

    testService = app.get<TestService>(TestService);
    if (!testService) {
      throw new Error('Failed to initialize TestService');
    }
    invitationService = app.get<InvitationService>(InvitationService);
    if (!invitationService) {
      throw new Error('Failed to initialize InvitationService');
    }
    userService = app.get<UserService>(UserService);
    if (!userService) {
      throw new Error('Failed to initialize UserService');
    }
    overviewService = app.get<OverviewService>(OverviewService);
    if (!overviewService) {
      throw new Error('Failed to initialize OverviewService');
    }
    redisService = app.get<RedisService>(RedisService);
    if (!redisService) {
      throw new Error('Failed to initialize RedisService');
    }

    const configService = app.get<ConfigService>(ConfigService);
    if (!configService) {
      throw new Error('Failed to initialize ConfigService');
    }
    invitationConfig = configService.get<InvitationConfig>('invitation')!;

    await testService.clear();
    await redisService.flushdb();
  });

  afterAll(async () => {
    await app.close();
  });

  it('referral', async () => {
    const initTelegramId = testService.generateTelegramId(0);
    const initUser = await testService.tryCreateUser(initTelegramId, '');
    let initUserOverview = await overviewService.info(initUser, testService.entityManager);

    const invitationLvl0 = invitationService.getLevel(0);
    expect(initUserOverview.invitation.invitationCode.length).toBe(6);
    expect(initUserOverview.invitation.targetReferralNums).toBe(invitationLvl0.memberNums);
    expect(initUserOverview.invitation.currentReferralNums).toBe(0);
    expect(initUserOverview.invitation.uncheckedRewards.rewardCoins).toBe(0);
    expect(initUserOverview.invitation.uncheckedRewards.rewardPlays).toBe(0);
    expect(initUserOverview.invitation.checkedLevel).toBe(0);
    expect(initUserOverview.invitation.uncheckedLevel).toBe(0);

    // init user invite invitee1
    const inviteeTelegramId1 = testService.generateTelegramId(1);
    await testService.tryCreateUser(inviteeTelegramId1, initUserOverview.invitation.invitationCode);

    initUserOverview = await overviewService.info(initUser, testService.entityManager);
    expect(initUserOverview.invitation.currentReferralNums).toBe(1);

    // init user invite another two invitee
    const inviteeTelegramId2 = testService.generateTelegramId(2);
    await testService.tryCreateUser(inviteeTelegramId2, initUserOverview.invitation.invitationCode);
    const inviteeTelegramId3 = testService.generateTelegramId(3);
    await testService.tryCreateUser(inviteeTelegramId3, initUserOverview.invitation.invitationCode);

    const invitationLvl1 = invitationService.getLevel(1);
    initUserOverview = await overviewService.info(initUser, testService.entityManager);
    expect(initUserOverview.invitation.currentReferralNums).toBe(3);
    expect(initUserOverview.invitation.targetReferralNums).toBe(invitationLvl0.memberNums);
    expect(initUserOverview.invitation.uncheckedRewards.rewardCoins).toBe(invitationLvl1.rewardCoins);
    expect(initUserOverview.invitation.uncheckedRewards.rewardPlays).toBe(invitationLvl1.rewardPlays);
    expect(initUserOverview.invitation.uncheckedLevel).toBe(1);

    // init user invite another 1 invitee
    const inviteeTelegramId4 = testService.generateTelegramId(4);
    await testService.tryCreateUser(inviteeTelegramId4, initUserOverview.invitation.invitationCode);

    initUserOverview = await overviewService.info(initUser, testService.entityManager);
    expect(initUserOverview.invitation.currentReferralNums).toBe(4);
    expect(initUserOverview.invitation.targetReferralNums).toBe(invitationLvl0.memberNums);
    expect(initUserOverview.invitation.uncheckedRewards.rewardCoins).toBe(invitationLvl1.rewardCoins);
    expect(initUserOverview.invitation.uncheckedRewards.rewardPlays).toBe(invitationLvl1.rewardPlays);
    expect(initUserOverview.invitation.uncheckedLevel).toBe(1);

    // init user invite another 5 invitee
    for (let i = 5; i < 10; i++) {
      const inviteeTelegramId = testService.generateTelegramId(i);
      await testService.tryCreateUser(inviteeTelegramId, initUserOverview.invitation.invitationCode);
    }

    const invitationLvl2 = invitationService.getLevel(2);
    initUserOverview = await overviewService.info(initUser, testService.entityManager);
    expect(initUserOverview.invitation.currentReferralNums).toBe(9);
    expect(initUserOverview.invitation.targetReferralNums).toBe(invitationLvl0.memberNums);
    expect(initUserOverview.invitation.uncheckedRewards.rewardCoins).toBe(
      invitationLvl1.rewardCoins + invitationLvl2.rewardCoins,
    );
    expect(initUserOverview.invitation.uncheckedRewards.rewardPlays).toBe(
      invitationLvl1.rewardPlays + invitationLvl2.rewardPlays,
    );
    expect(initUserOverview.invitation.uncheckedLevel).toBe(2);

    // init user claimRewards
    const uniId = await invitationService.claimRewards(initUser, testService.entityManager);
    expect(uniId.length).toBeGreaterThan(0);

    initUserOverview = await overviewService.info(initUser, testService.entityManager);
    expect(initUserOverview.invitation.targetReferralNums).toBe(invitationLvl2.memberNums);
    expect(initUserOverview.invitation.uncheckedRewards.rewardCoins).toBe(0);
    expect(initUserOverview.invitation.uncheckedRewards.rewardPlays).toBe(0);
    expect(initUserOverview.invitation.checkedLevel).toBe(2);
    expect(initUserOverview.invitation.uncheckedLevel).toBe(2);
  });
});
