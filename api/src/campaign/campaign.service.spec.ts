import { HttpService } from '@nestjs/axios';
import { INestApplication } from '@nestjs/common';

import { CampaignModule } from '@/campaign/campaign.module';
import { CampaignService } from '@/campaign/campaign.service';
import { CommonModule } from '@/common/common.module';
import { TestHelper } from '@/test-utils/helper';
import { TestModule } from '@/test-utils/test.module';
import { TestService } from '@/test-utils/test.service';

describe('CampaignService Test', () => {
  let app: INestApplication;

  let testService: TestService;
  let httpService: HttpService;
  let campaignService: CampaignService;

  beforeAll(async () => {
    const res = await TestHelper.build({
      imports: [CommonModule, TestModule, CampaignModule],
    });

    app = res.app;

    testService = app.get<TestService>(TestService);
    if (!testService) {
      throw new Error('Failed to initialize TestService');
    }
    httpService = app.get<HttpService>(HttpService);
    if (!httpService) {
      throw new Error('Failed to initialize HttpService');
    }
    campaignService = app.get<CampaignService>(CampaignService);
    if (!campaignService) {
      throw new Error('Failed to initialize CampaignService');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('add referral', async () => {
    const authToken = 'P@*v#aZKDFsd6XOxPx^A1r0t&wy#vucT';
    const host = 'http://localhost:3000';
    const telegramId = '3';

    // 1. add referral user
    const addReferralUserRequestUrl = `${host}/user/create_internal`;
    let res = await httpService.axiosRef.post(
      addReferralUserRequestUrl,
      {
        telegramId,
      },
      {
        headers: {
          'admin-auth-token': authToken,
        },
      },
    );
    expect(res.status).toBe(201);

    // 2. get referral user resource address
    const resourceAddressUrl = `${host}/overview/info_internal/${telegramId}`;
    res = await httpService.axiosRef.get(resourceAddressUrl, { headers: { 'admin-auth-token': authToken } });
    const { resourceAddress } = res.data.user;
    expect(resourceAddress.length).toBeGreaterThan(0);
    const { invitationCode } = res.data.invitation;
    expect(invitationCode.length).toBe(6);

    // 3. bind
    const bindReferralUrl = `${host}/campaign/bind_referral_internal`;
    res = await httpService.axiosRef.post(
      bindReferralUrl,
      { referralCode: invitationCode },
      {
        headers: {
          'admin-auth-token': authToken,
        },
      },
    );
    expect(res.status).toBe(201);
  });

  it('galxe test', async () => {
    const userId = 9999;
    const telegramId = 'telegramId1111';
    const code = 'OWUXMTG0ZTYTMDIYYY0ZOTCWLTHJMWUTYWNKNWIZNZHKN2I2';

    await campaignService.bindGalxeEvmAddress(testService.entityManager, { userId, telegramId, code });
    // const checkRes = await campaignService.galxeCheck(testService.entityManager, evmAddress);
    // expect(checkRes.is_ok).toBe(true);
  });
});
