import { Aptos, InputGenerateTransactionPayloadData, AccountAddressInput } from '@aptos-labs/ts-sdk';
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

  private readonly resourceAccountExistPrefix = 'momo-rs-exist-';

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
    const redisKey = `${this.resourceAccountExistPrefix}${resourceAccount}`;
    const cachedExists = await this.redisService.exists(redisKey);
    if (cachedExists) {
      return true;
    }

    const [viewRes] = await this.aptos.view({
      payload: {
        function: `${this.contractId}::momo::resource_account_exists`,
        functionArguments: [resourceAccount],
      },
    });
    const exists = viewRes as boolean;

    if (exists) {
      await this.redisService.setnx(redisKey, 1);
    }
    return exists as boolean;
  }

  async isOperator(account: string | AccountAddressInput) {
    const [viewRes] = await this.aptos.view({
      payload: {
        function: `${this.contractId}::role::is_operator`,
        functionArguments: [account],
      },
    });
    return viewRes as boolean;
  }

  async createResourceAccountSimple(input: { sender: AccountAddressInput; userAccountHash: string }) {
    return this.aptos.transaction.build.simple({
      sender: input.sender,
      data: {
        function: `${this.contractId}::momo::create_resource_account`,
        functionArguments: [input.userAccountHash],
      },
    });
  }

  async createResourceAccount(txs: InputGenerateTransactionPayloadData[], userAccountHash: string) {
    txs.push({
      function: `${this.contractId}::momo::create_resource_account`,
      functionArguments: [userAccountHash],
    });
  }

  async createResourceAccountAndMintTokenSimple(input: {
    sender: AccountAddressInput;
    userAccountHash: string;
    uniId: string;
    amount: BigNumber;
  }) {
    const { sender, userAccountHash, uniId, amount } = input;
    const amountInWei = amount.times(10 ** this.decimals).toFixed();
    return this.aptos.transaction.build.simple({
      sender,
      data: {
        function: `${this.contractId}::momo::create_resource_account_and_mint_token`,
        functionArguments: [userAccountHash, uniId, amountInWei],
      },
    });
  }

  async mintTokenSimple(input: { sender: AccountAddressInput; receipt: string; uniId: string; amount: BigNumber }) {
    const { sender, receipt, uniId, amount } = input;
    const amountInWei = amount.times(10 ** this.decimals).toFixed();
    return this.aptos.transaction.build.simple({
      sender,
      data: {
        function: `${this.contractId}::momo::mint_token`,
        functionArguments: [receipt, uniId, amountInWei],
      },
    });
  }

  async mintToken(
    txs: InputGenerateTransactionPayloadData[],
    input: { receipt: string; uniId: string; amount: BigNumber },
  ) {
    const { receipt, uniId, amount } = input;
    const amountInWei = amount.times(10 ** this.decimals).toFixed();
    txs.push({
      function: `${this.contractId}::momo::mint_token`,
      functionArguments: [receipt, uniId, amountInWei],
    });
  }

  async batchMintTokenSimple(input: { sender: string; receipts: string[]; uniId: string; amount: BigNumber }) {
    const { sender, receipts, uniId, amount } = input;
    const amountInWei = amount.times(10 ** this.decimals).toFixed();
    return this.aptos.transaction.build.simple({
      sender,
      data: {
        function: `${this.contractId}::momo::batch_mint_token`,
        functionArguments: [receipts, uniId, amountInWei],
      },
    });
  }

  async batchMintToken(
    txs: InputGenerateTransactionPayloadData[],
    input: { receipts: string[]; uniId: string; amount: BigNumber },
  ) {
    const { receipts, uniId, amount } = input;
    const amountInWei = amount.times(10 ** this.decimals).toFixed();
    txs.push({
      function: `${this.contractId}::momo::batch_mint_token`,
      functionArguments: [receipts, uniId, amountInWei],
    });
  }

  async transferTokenSimple(input: { sender: string; from: string; to: string; uniId: string; amount: BigNumber }) {
    const { sender, from, to, uniId, amount } = input;
    const amountInWei = amount.times(10 ** this.decimals).toFixed();
    return this.aptos.transaction.build.simple({
      sender,
      data: {
        function: `${this.contractId}::momo::transfer_token`,
        functionArguments: [from, to, uniId, amountInWei],
      },
    });
  }

  async transferToken(
    txs: InputGenerateTransactionPayloadData[],
    input: { from: string; to: string; uniId: string; amount: BigNumber },
  ) {
    const { from, to, uniId, amount } = input;
    const amountInWei = amount.times(10 ** this.decimals).toFixed();
    txs.push({
      function: `${this.contractId}::momo::transfer_token`,
      functionArguments: [from, to, uniId, amountInWei],
    });
  }

  async referralBonusSimple(input: { sender: string; inviter: string; uniId: string; amount: BigNumber }) {
    const { sender, inviter, uniId, amount } = input;
    const amountInWei = amount.times(10 ** this.decimals).toFixed();
    return this.aptos.transaction.build.simple({
      sender,
      data: {
        function: `${this.contractId}::momo::referral_bonus`,
        functionArguments: [inviter, uniId, amountInWei],
      },
    });
  }

  async referralBonus(
    txs: InputGenerateTransactionPayloadData[],
    input: { inviter: string; uniId: string; amount: BigNumber },
  ) {
    const { inviter, uniId, amount } = input;
    const amountInWei = amount.times(10 ** this.decimals).toFixed();
    txs.push({
      function: `${this.contractId}::momo::referral_bonus`,
      functionArguments: [inviter, uniId, amountInWei],
    });
  }

  async taskBonusSimple(input: { sender: string; receipt: string; uniId: string; amount: BigNumber }) {
    const { sender, receipt, uniId, amount } = input;
    const amountInWei = amount.times(10 ** this.decimals).toFixed();
    return this.aptos.transaction.build.simple({
      sender,
      data: {
        function: `${this.contractId}::momo::task_bonus`,
        functionArguments: [receipt, uniId, amountInWei],
      },
    });
  }

  async taskBonus(
    txs: InputGenerateTransactionPayloadData[],
    input: { receipt: string; uniId: string; amount: BigNumber },
  ) {
    const { receipt, uniId, amount } = input;
    const amountInWei = amount.times(10 ** this.decimals).toFixed();
    txs.push({
      function: `${this.contractId}::momo::task_bonus`,
      functionArguments: [receipt, uniId, amountInWei],
    });
  }

  async addOperator(input: { sender: string | AccountAddressInput; operator: string | AccountAddressInput }) {
    const { sender, operator } = input;
    return this.aptos.transaction.build.simple({
      sender,
      data: {
        function: `${this.contractId}::role::add_operator`,
        functionArguments: [operator],
      },
    });
  }

  async removeOperator(input: { sender: string | AccountAddressInput; operator: string | AccountAddressInput }) {
    const { sender, operator } = input;
    return this.aptos.transaction.build.simple({
      sender,
      data: {
        function: `${this.contractId}::role::remove_operator`,
        functionArguments: [operator],
      },
    });
  }

  async transferAdmin(input: { sender: string | AccountAddressInput; newAdmin: string }) {
    const { sender, newAdmin } = input;
    return this.aptos.transaction.build.simple({
      sender,
      data: {
        function: `${this.contractId}::role::transfer_admin`,
        functionArguments: [newAdmin],
      },
    });
  }

  async acceptAdmin(sender: string | AccountAddressInput) {
    return this.aptos.transaction.build.simple({
      sender,
      data: {
        function: `${this.contractId}::role::accept_admin`,
        functionArguments: [],
      },
    });
  }
}
