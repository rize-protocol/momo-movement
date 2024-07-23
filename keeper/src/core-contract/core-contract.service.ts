import { Aptos } from '@aptos-labs/ts-sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import BigNumber from 'bignumber.js';

import { CoreContractConfig } from '@/common/config/types';
import { WalletService } from '@/wallet/wallet.service';

@Injectable()
export class CoreContractService {
  private readonly contractId: string;

  private readonly decimals: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
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
    try {
      const [resourceAccount] = await this.aptos.view({
        payload: {
          function: `${this.contractId}::momo::try_get_user_resource_account`,
          functionArguments: [userAccountHash],
        },
      });

      return resourceAccount as string;
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

  async createResourceAccount(userAccountHash: string) {
    return this.aptos.transaction.build.simple({
      sender: this.walletService.admin.accountAddress,
      data: {
        function: `${this.contractId}::momo::create_resource_account`,
        functionArguments: [userAccountHash],
      },
    });
  }

  async mintToken(receipt: string, amount: BigNumber) {
    const amountInWei = amount.times(10 ** this.decimals).toFixed();
    return this.aptos.transaction.build.simple({
      sender: this.walletService.admin.accountAddress,
      data: {
        function: `${this.contractId}::momo::mint_token`,
        functionArguments: [receipt, amountInWei],
      },
    });
  }

  async batchMintToken(receipts: string[], amount: BigNumber) {
    const amountInWei = amount.times(10 ** this.decimals).toFixed();
    return this.aptos.transaction.build.simple({
      sender: this.walletService.admin.accountAddress,
      data: {
        function: `${this.contractId}::momo::batch_mint_token`,
        functionArguments: [receipts, amountInWei],
      },
    });
  }

  async transferToken(from: string, to: string, amount: BigNumber) {
    const amountInWei = amount.times(10 ** this.decimals).toFixed();
    return this.aptos.transaction.build.simple({
      sender: this.walletService.admin.accountAddress,
      data: {
        function: `${this.contractId}::momo::transfer_token`,
        functionArguments: [from, to, amountInWei],
      },
    });
  }

  async referralBonus(inviter: string, amount: BigNumber) {
    const amountInWei = amount.times(10 ** this.decimals).toFixed();
    return this.aptos.transaction.build.simple({
      sender: this.walletService.admin.accountAddress,
      data: {
        function: `${this.contractId}::momo::referral_bonus`,
        functionArguments: [inviter, amountInWei],
      },
    });
  }
}
