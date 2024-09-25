import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CampaignGalxe, CampaignReferral, User } from 'movement-gaming-model';
import qs from 'qs';
import { EntityManager } from 'typeorm';

import { CampaignConfig, GalxeConfig } from '@/common/config/types';
import { SecretManagerService } from '@/common/services/secret-manager.service';
import { checkBadRequest } from '@/common/utils/check';
import { GameService } from '@/game/game.service';
import { InvitationService } from '@/invitation/invitation.service';

@Injectable()
export class CampaignService implements OnModuleInit {
  private referralRewardCoins: number;

  private galxeConfig: GalxeConfig;

  private galxeClientId: string;

  private galxeClientSecret: string;

  private readonly logger = console;

  constructor(
    private readonly configService: ConfigService,
    private readonly invitationService: InvitationService,
    private readonly gameService: GameService,
    private readonly secretManagerService: SecretManagerService,
    private readonly httpService: HttpService,
  ) {}

  async onModuleInit() {
    const campaignConfig = this.configService.get<CampaignConfig>('campaign');
    if (!campaignConfig) {
      throw new Error('campaign config not found');
    }
    this.referralRewardCoins = campaignConfig.referralCoins;

    const galxeConfig = this.configService.get<GalxeConfig>('galxe');
    if (!galxeConfig) {
      throw new Error('galxe config not found');
    }
    this.galxeConfig = galxeConfig;

    const clientId = await this.secretManagerService.getConfigValue(this.galxeConfig.clientId);
    if (!clientId) {
      throw new Error('invalid galxe client id');
    }
    this.galxeClientId = clientId;

    const clientSecret = await this.secretManagerService.getConfigValue(this.galxeConfig.clientSecret);
    if (!clientSecret) {
      throw new Error('invalid galxe client secret');
    }
    this.galxeClientSecret = clientSecret;
  }

  async bindReferralCodeInternal(referralCode: string, entityManager: EntityManager) {
    const isValidCode = await this.invitationService.isValidInvitationCode(referralCode, entityManager);
    checkBadRequest(isValidCode, 'invalid referral code');

    const exist = await entityManager.findOneBy(CampaignReferral, { referralCode });
    checkBadRequest(!exist, 'referral code exist');

    await entityManager.insert(CampaignReferral, { referralCode, extra: '' });
  }

  async referralListInternal(entityManager: EntityManager) {
    const list = await entityManager.find(CampaignReferral);
    return list.map((item) => item.referralCode);
  }

  async isReferralCampaignCode(referralCode: string, entityManager: EntityManager) {
    return entityManager.existsBy(CampaignReferral, { referralCode });
  }

  getReferralCoinAmount() {
    return this.referralRewardCoins;
  }

  async bindGalxeEvmAddress(entityManager: EntityManager, input: { userId: number; telegramId: string; code: string }) {
    const { userId, telegramId, code } = input;
    checkBadRequest(!!code, 'invalid galxe code');

    const accessToken = await this.mustGetGalxeAccessToken(code);
    this.logger.log(`userId: ${userId}, accessToken: ${accessToken}`);

    const evmAddress = await this.mustGetGalxeEvmAddress(accessToken);
    this.logger.log(`userId: ${userId}, evmAddress: ${evmAddress}`);

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

  async galxeUserExist(entityManager: EntityManager, evmAddress: string) {
    checkBadRequest(!!evmAddress, 'invalid evm address');
    const exist = await entityManager.existsBy(CampaignGalxe, { evmAddress });
    return { is_ok: exist };
  }

  async galxeCheckActivity(entityManager: EntityManager, evmAddress: string) {
    checkBadRequest(!!evmAddress, 'invalid evm address');
    const existUser = await entityManager.findOneBy(CampaignGalxe, { evmAddress });
    if (!existUser) {
      return { is_ok: false };
    }
    const existActivity = await this.gameService.userHasPlayedBefore(existUser.userId, entityManager);
    return { is_ok: existActivity };
  }

  async secure3Check(entityManager: EntityManager, telegramId: string) {
    checkBadRequest(!!telegramId, 'invalid telegramId');
    const exist = await entityManager.existsBy(CampaignGalxe, { telegramId });
    return { is_ok: exist };
  }

  async intractCheck(entityManager: EntityManager, telegramId: string) {
    checkBadRequest(!!telegramId, 'invalid telegramId');
    const existActivity = await this.gameService.userHasPlayedBeforeByTelegramId(telegramId, entityManager);
    return { is_ok: existActivity };
  }

  async telegramList(entityManager: EntityManager) {
    const userList = await entityManager.find(User, { order: { id: 'asc' } });
    return userList.map((user) => user.telegramId);
  }

  private async mustGetGalxeAccessToken(code: string) {
    let accessToken: string;
    try {
      const accessTokenRes = await this.httpService.axiosRef.post(
        this.galxeConfig.getAccessTokenUrl,
        qs.stringify({
          client_id: this.galxeClientId,
          client_secret: this.galxeClientSecret,
          code,
          grant_type: 'authorization_code',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      accessToken = accessTokenRes?.data?.access_token as string;
    } catch (e) {
      const errMsg = `bind galxe failed: ${e}`;
      this.logger.log(errMsg);
      throw new BadRequestException(errMsg);
    }

    if (!accessToken || accessToken.length === 0) {
      throw new BadRequestException(`bind galxe invalid accessToken returned`);
    }
    return accessToken;
  }

  private async mustGetGalxeEvmAddress(accessToken: string) {
    let evmAddress: string;
    try {
      const userInfoRes = await this.httpService.axiosRef.get(this.galxeConfig.getUserInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      evmAddress = userInfoRes?.data?.EVMAddress as string;
    } catch (e) {
      const errMsg = `get galxe userInfo failed: ${e}`;
      this.logger.log(errMsg);
      throw new BadRequestException(errMsg);
    }

    if (!evmAddress || evmAddress.length === 0) {
      throw new BadRequestException(`bind galxe invalid evmAddress returned`);
    }
    return evmAddress;
  }
}
