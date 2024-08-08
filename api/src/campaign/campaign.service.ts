import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CampaignReferral } from 'movement-gaming-model';
import { EntityManager } from 'typeorm';

import { CampaignConfig } from '@/common/config/types';
import { checkBadRequest } from '@/common/utils/check';
import { InvitationService } from '@/invitation/invitation.service';

@Injectable()
export class CampaignService {
  private readonly referralRewardCoins: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly invitationService: InvitationService,
  ) {
    const campaignConfig = this.configService.get<CampaignConfig>('campaign');
    if (!campaignConfig) {
      throw new Error('campaign config not found');
    }
    this.referralRewardCoins = campaignConfig.referralCoins;
  }

  async bindReferralCode(referralCode: string, entityManager: EntityManager) {
    const isValidCode = await this.invitationService.isValidInvitationCode(referralCode, entityManager);
    checkBadRequest(isValidCode, 'invalid referral code');

    const exist = await entityManager.findOneBy(CampaignReferral, { referralCode });
    checkBadRequest(!exist, 'referral code exist');

    await entityManager.insert(CampaignReferral, { referralCode, extra: '' });
  }

  async referralList(entityManager: EntityManager) {
    const list = await entityManager.find(CampaignReferral);
    return list.map((item) => item.referralCode);
  }

  async isReferralCampaignCode(referralCode: string, entityManager: EntityManager) {
    return entityManager.existsBy(CampaignReferral, { referralCode });
  }

  getReferralCoinAmount() {
    return this.referralRewardCoins;
  }
}
