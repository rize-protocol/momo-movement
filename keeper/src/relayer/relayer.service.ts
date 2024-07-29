import { Aptos, InputGenerateTransactionPayloadData, TransactionWorkerEventsEnum } from '@aptos-labs/ts-sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';

import { RelayerConfig } from '@/common/config/types';
import { RedisService } from '@/common/services/redis.service';
import { TimeService } from '@/common/services/time.service';
import { CoreContractService } from '@/core-contract/core-contract.service';
import { Command } from '@/relayer/types';
import { WalletService } from '@/wallet/wallet.service';

@Injectable()
export class RelayerService {
  private isRunning = false;

  private readonly commandRedisKey: string;

  private readonly logger = new Logger(RelayerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly coreContractService: CoreContractService,
    private readonly walletService: WalletService,
    private readonly redisService: RedisService,
    private readonly aptos: Aptos,
    private readonly timeService: TimeService,
  ) {
    const relayerConfig = this.configService.get<RelayerConfig>('relayer');
    if (!relayerConfig) {
      throw new Error('relayer config not found');
    }
    this.commandRedisKey = relayerConfig.commandRedisKey;
  }

  @Cron(CronExpression.EVERY_SECOND)
  async cronRelay() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;

    try {
      await this.handleRelay();
    } finally {
      this.isRunning = false;
    }
  }

  private async handleRelay() {
    const batch = 100;
    const txs: InputGenerateTransactionPayloadData[] = [];
    for (let i = 0; i < batch; i++) {
      const commandStr = await this.redisService.lpop(this.commandRedisKey);
      if (!commandStr) {
        break;
      }

      await this.handleCommand(txs, commandStr);
    }
    if (txs.length === 0) {
      this.logger.log('[handleRelay] do not have new transactions, return');
      return;
    }

    this.aptos.transaction.batch.forSingleAccount({ sender: this.walletService.operator, data: txs });
    this.aptos.transaction.batch.on(TransactionWorkerEventsEnum.TransactionSent, async (data) => {
      this.logger.log(`[handleRelay] transaction sent, hash: ${data.transactionHash}`);
    });
    let success = 0;
    this.aptos.transaction.batch.on(TransactionWorkerEventsEnum.TransactionExecuted, async (data) => {
      this.logger.log(`[handleRelay] transaction executed, hash: ${data.transactionHash}`);
      success++;
    });

    let executing = true;
    this.aptos.transaction.batch.on(TransactionWorkerEventsEnum.ExecutionFinish, async () => {
      this.logger.log(`[handleRelay] success: ${success}, total: ${txs.length}`);
      executing = false;
      this.aptos.transaction.batch.removeAllListeners();
    });

    while (executing) {
      await this.timeService.sleep(500);
    }
    this.logger.log(`[handleRelay] done`);
  }

  private async handleCommand(txs: InputGenerateTransactionPayloadData[], commandStr: string) {
    this.logger.log(`[handleCommand] command: ${commandStr}`);

    const command = JSON.parse(commandStr) as Command;
    switch (command.type) {
      case 'create_resource_account':
        await this.handleCreateResourceAccount(txs, command.userAccountHash);
        break;
      case 'mint_token':
        await this.handleMintToken(txs, {
          receipt: command.receipt,
          uniId: command.uniId,
          amount: new BigNumber(command.amount),
        });
        break;
      case 'transfer_token':
        await this.handleTransferToken(txs, {
          from: command.from,
          to: command.to,
          uniId: command.uniId,
          amount: new BigNumber(command.amount),
        });
        break;
      case 'referral_bonus':
        await this.handleReferralToken(txs, {
          inviter: command.inviter,
          uniId: command.uniId,
          amount: new BigNumber(command.amount),
        });
        break;
      default:
        throw new Error(`Unknown command type: ${(command as Command).type}`);
    }
  }

  private async handleCreateResourceAccount(txs: InputGenerateTransactionPayloadData[], userAccountHash: string) {
    const resourceAccount = await this.coreContractService.tryGetUserResourceAccount(userAccountHash);
    if (resourceAccount) {
      this.logger.log(
        `[handleCreateResourceAccount] resourceAccount: ${resourceAccount} exist, hash: ${userAccountHash}, return`,
      );
      return;
    }

    await this.coreContractService.createResourceAccount(txs, userAccountHash);
  }

  private async handleMintToken(
    txs: InputGenerateTransactionPayloadData[],
    input: { receipt: string; uniId: string; amount: BigNumber },
  ) {
    const { receipt } = input;

    const exists = await this.coreContractService.resourceAccountExists(receipt);
    if (!exists) {
      this.logger.log(`[handleMintToken] receipt resource account: ${receipt} not exist, return`);
      return;
    }

    await this.coreContractService.mintToken(txs, input);
  }

  private async handleTransferToken(
    txs: InputGenerateTransactionPayloadData[],
    input: { from: string; to: string; uniId: string; amount: BigNumber },
  ) {
    const { from } = input;

    const exists = await this.coreContractService.resourceAccountExists(from);
    if (!exists) {
      this.logger.log(`[handleTransferToken] from resource account: ${from} not exist, return`);
      return;
    }

    await this.coreContractService.transferToken(txs, input);
  }

  private async handleReferralToken(
    txs: InputGenerateTransactionPayloadData[],
    input: { inviter: string; uniId: string; amount: BigNumber },
  ) {
    const { inviter } = input;

    const exists = await this.coreContractService.resourceAccountExists(inviter);
    if (!exists) {
      this.logger.log(`[handleReferralToken] inviter resource account: ${inviter} not exist, return`);
      return;
    }

    await this.coreContractService.referralBonus(txs, input);
  }
}
