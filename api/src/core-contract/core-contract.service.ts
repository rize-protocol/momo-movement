import { Aptos } from '@aptos-labs/ts-sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import BigNumber from 'bignumber.js';

import { CoreContractConfig } from '@/common/config/types';
import { RedisService } from '@/common/services/redis.service';

@Injectable()
export class CoreContractService {
  private readonly contractId: string;

  private readonly decimals: number;

  private readonly resourceAccountHashPrefix = 'momo-rs-hash-';

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly aptos: Aptos,
  ) {
    const coreContractConfig = this.configService.get<CoreContractConfig>('core-contract');
    if (!coreContractConfig) {
      throw new Error('core-contract config not found');
    }

    this.contractId = coreContractConfig.contractId;
    this.decimals = coreContractConfig.decimals;
  }

  async tryGetUserResourceAccount(userAccountHash: string) {
    const redisKey = `${this.resourceAccountHashPrefix}${userAccountHash}`;
    const cachedResourceAccount = await this.redisService.get(redisKey);
    if (cachedResourceAccount) {
      return cachedResourceAccount;
    }

    try {
      const [viewRes] = await this.aptos.view({
        payload: {
          function: `${this.contractId}::momo::try_get_user_resource_account`,
          functionArguments: [userAccountHash],
        },
      });

      const resourceAccount = viewRes as string;
      await this.redisService.setnx(redisKey, resourceAccount);
      return resourceAccount;
    } catch (e) {
      return undefined;
    }
  }

  async momoBalance(resourceAccount: string) {
    const [balance] = await this.aptos.view({
      payload: {
        function: `${this.contractId}::momo::momo_balance`,
        functionArguments: [resourceAccount],
      },
    });
    return new BigNumber(balance as string).div(10 ** this.decimals);
  }

  async resourceAccountExists(resourceAccount: string) {
    const [exists] = await this.aptos.view({
      payload: {
        function: `${this.contractId}::momo::resource_account_exists`,
        functionArguments: [resourceAccount],
      },
    });
    return exists as boolean;
  }
}
