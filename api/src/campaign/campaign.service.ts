import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CampaignGalxe, CampaignReferral } from 'movement-gaming-model';
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

  async bindGalxeEvmAddress(
    entityManager: EntityManager,
    input: { userId: number; telegramId: string; evmAddress: string },
  ) {
    const { userId, telegramId, evmAddress } = input;
    checkBadRequest(!!evmAddress, 'invalid evm address');

    const exist = await entityManager.findOneBy(CampaignGalxe, { userId });
    if (exist) {
      await entityManager.update(CampaignGalxe, { userId }, { evmAddress });
    } else {
      await entityManager.insert(CampaignGalxe, { userId, telegramId, evmAddress, extra: '' });
    }
  }

  async getUserEvmAddress(userId: number, entityManager: EntityManager) {
    const exist = await entityManager.findOneBy(CampaignGalxe, { userId });
    return exist?.evmAddress ?? '';
  }

  async galxeCheck(entityManager: EntityManager, evmAddress: string) {
    checkBadRequest(!!evmAddress, 'invalid evm address');
    const exist = await entityManager.existsBy(CampaignGalxe, { evmAddress });
    return { is_ok: exist };
  }

  async secure3Check(entityManager: EntityManager, telegramId: string) {
    checkBadRequest(!!telegramId, 'invalid telegramId');
    const exist = await entityManager.existsBy(CampaignGalxe, { telegramId });
    return { is_ok: exist };
  }
}
