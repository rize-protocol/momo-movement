import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';

import { RelayerConfig } from '@/common/config/types';
import { RedisService } from '@/common/services/redis.service';
import { CoreContractService } from '@/core-contract/core-contract.service';
import { Command } from '@/relayer/types';
import { WalletService } from '@/wallet/wallet.service';

@Injectable()
export class RelayerService implements OnModuleInit {
  private isRunning = false;

  private readonly commandRedisKey: string;

  private readonly logger = new Logger(RelayerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly coreContractService: CoreContractService,
    private readonly walletService: WalletService,
    private readonly redisService: RedisService,
  ) {
    const relayerConfig = this.configService.get<RelayerConfig>('relayer');
    if (!relayerConfig) {
      throw new Error('relayer config not found');
    }
    this.commandRedisKey = relayerConfig.commandRedisKey;
  }

  async onModuleInit() {
    console.log('relyuaer', this.commandRedisKey);
  }

  @Cron(CronExpression.EVERY_SECOND)
  async cronCommand() {
    if (this.isRunning) {
      return;
    }
    this.logger.log('[handleCommand] start');
    this.isRunning = true;

    try {
      while (true) {
        const commandStr = await this.redisService.lpop(this.commandRedisKey);
        if (!commandStr) {
          this.logger.log('[cronCommand] do not have new command, return');
          break;
        }

        await this.handleCommand(commandStr);
      }
    } finally {
      this.isRunning = false;
    }

    this.logger.log('[handleCommand] end');
  }

  private async handleCommand(commandStr: string) {
    this.logger.log(`[handleCommand] command: ${commandStr}`);

    const command = JSON.parse(commandStr) as Command;
    switch (command.type) {
      case 'create_resource_account':
        await this.handleCreateResourceAccount(command.userAccountHash);
        break;
      case 'mint_token':
        await this.handleMintToken(command.receipt, new BigNumber(command.amount));
        break;
      case 'transfer_token':
        await this.handleTransferToken(command.from, command.to, new BigNumber(command.amount));
        break;
      case 'referral_bonus':
        await this.handleReferralToken(command.inviter, new BigNumber(command.amount));
        break;
      default:
        throw new Error(`Unknown command type: ${(command as Command).type}`);
    }
  }

  private async handleCreateResourceAccount(userAccountHash: string) {
    const resourceAccount = await this.coreContractService.tryGetUserResourceAccount(userAccountHash);
    if (resourceAccount) {
      this.logger.log(
        `[handleCreateResourceAccount] resourceAccount: ${resourceAccount} exist, hash: ${userAccountHash}, return`,
      );
      return;
    }

    const tx = await this.coreContractService.createResourceAccount(userAccountHash);
    const simulateRes = await this.walletService.simulateTransaction(tx);
    if (!simulateRes.success) {
      throw new Error(`[handleCreateResourceAccount] simulate error: ${JSON.stringify(simulateRes)}`);
    }

    const committedTxn = await this.walletService.signAndSubmitTransaction(tx);
    await this.walletService.waitForTransaction(committedTxn.hash);
    this.logger.log(`[handleCreateResourceAccount] create resource account hash: ${committedTxn.hash} done`);
  }

  private async handleMintToken(receipt: string, amount: BigNumber) {
    const exists = await this.coreContractService.resourceAccountExists(receipt);
    if (!exists) {
      this.logger.log(`[handleMintToken] receipt resource account: ${receipt} not exist, return`);
      return;
    }

    const tx = await this.coreContractService.mintToken(receipt, amount);
    const simulateRes = await this.walletService.simulateTransaction(tx);
    if (!simulateRes.success) {
      throw new Error(`[handleMintToken] simulate error: ${JSON.stringify(simulateRes)}`);
    }

    const committedTxn = await this.walletService.signAndSubmitTransaction(tx);
    await this.walletService.waitForTransaction(committedTxn.hash);
    console.log(`[handleMintToken] mint token hash: ${committedTxn.hash} done`);
  }

  private async handleTransferToken(from: string, to: string, amount: BigNumber) {
    const exists = await this.coreContractService.resourceAccountExists(from);
    if (!exists) {
      this.logger.log(`[handleTransferToken] from resource account: ${from} not exist, return`);
      return;
    }

    const tx = await this.coreContractService.transferToken(from, to, amount);
    const simulateRes = await this.walletService.simulateTransaction(tx);
    if (!simulateRes.success) {
      throw new Error(`[handleTransferToken] simulate error: ${JSON.stringify(simulateRes)}`);
    }

    const committedTxn = await this.walletService.signAndSubmitTransaction(tx);
    await this.walletService.waitForTransaction(committedTxn.hash);
    console.log(`[handleTransferToken] transfer token hash: ${committedTxn.hash} done`);
  }

  private async handleReferralToken(inviter: string, amount: BigNumber) {
    const exists = await this.coreContractService.resourceAccountExists(inviter);
    if (!exists) {
      this.logger.log(`[handleReferralToken] inviter resource account: ${inviter} not exist, return`);
      return;
    }

    const tx = await this.coreContractService.referralBonus(inviter, amount);
    const simulateRes = await this.walletService.simulateTransaction(tx);
    if (!simulateRes.success) {
      throw new Error(`[handleReferralToken] simulate error: ${JSON.stringify(simulateRes)}`);
    }

    const committedTxn = await this.walletService.signAndSubmitTransaction(tx);
    await this.walletService.waitForTransaction(committedTxn.hash);
    console.log(`[handleReferralToken] transfer token hash: ${committedTxn.hash} done`);
  }
}
