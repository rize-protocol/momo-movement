import {
  Aptos,
  CommittedTransactionResponse,
  InputGenerateTransactionPayloadData,
  TransactionWorkerEventsEnum,
} from '@aptos-labs/ts-sdk';
import { StandardUnit } from '@aws-sdk/client-cloudwatch';
import { MetricDatum } from '@aws-sdk/client-cloudwatch/dist-types/models/models_0';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';

import { RelayerConfig } from '@/common/config/types';
import { MetricsService } from '@/common/services/metrics.service';
import { RedisService } from '@/common/services/redis.service';
import { TimeService } from '@/common/services/time.service';
import { CoreContractService } from '@/core-contract/core-contract.service';
import { Command } from '@/relayer/types';
import { WalletService } from '@/wallet/wallet.service';

@Injectable()
export class RelayerService {
  private isAccountRunning = false;

  private isTokenRunning = false;

  private readonly commandAccountRedisKey: string;

  private readonly commandTokenRedisKey: string;

  private readonly logger = new Logger(RelayerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly coreContractService: CoreContractService,
    private readonly walletService: WalletService,
    private readonly redisService: RedisService,
    private readonly aptos: Aptos,
    private readonly timeService: TimeService,
    private readonly metricsService: MetricsService,
  ) {
    const relayerConfig = this.configService.get<RelayerConfig>('relayer');
    if (!relayerConfig) {
      throw new Error('relayer config not found');
    }
    this.commandAccountRedisKey = relayerConfig.commandAccountRedisKey;
    this.commandTokenRedisKey = relayerConfig.commandTokenRedisKey;

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(0);
    });
  }

  @Cron(CronExpression.EVERY_SECOND)
  async cronRelayAccount() {
    const instanceId = parseInt(process.env.INSTANCE_ID ?? '0', 10);
    if (instanceId > 1) {
      return;
    }

    if (this.isAccountRunning) {
      return;
    }
    this.isAccountRunning = true;

    try {
      await this.handleRelayAccount();
    } catch (e) {
      this.logger.log(`[cronRelayAccount] error: ${e}`);
    } finally {
      this.isAccountRunning = false;
    }
  }

  @Cron(CronExpression.EVERY_SECOND)
  async cronRelayToken() {
    if (this.isTokenRunning) {
      return;
    }
    this.isTokenRunning = true;

    try {
      await this.handleRelayToken();
    } catch (e) {
      this.logger.log(`[cronRelayToken] error: ${e}`);
    } finally {
      this.isTokenRunning = false;
    }
  }

  private async handleRelayAccount() {
    const commandStr = (await this.redisService.lpop(this.commandAccountRedisKey)) as string;
    if (!commandStr) {
      // this.logger.log('[handleRelayAccount] do not have new transactions, return');
      return;
    }
    this.logger.log(`[handleRelayAccount] command: ${commandStr}`);
    const command = JSON.parse(commandStr) as Command;

    if (command.type !== 'create_resource_account' && command.type !== 'create_resource_account_and_mint_token') {
      throw new Error(`[handleRelayAccount] invalid command: ${commandStr}`);
    }

    const resourceAccount = await this.coreContractService.tryGetUserResourceAccount(command.userAccountHash);
    if (resourceAccount) {
      this.logger.log(
        `[handleRelayAccount] resourceAccount: ${resourceAccount} exist, hash: ${command.userAccountHash}, return`,
      );
      return;
    }

    let executedTxn: CommittedTransactionResponse;
    if (command.type === 'create_resource_account') {
      const tx = await this.coreContractService.createResourceAccountSimple({
        sender: this.walletService.admin.accountAddress,
        userAccountHash: command.userAccountHash,
      });
      const committedTxn = await this.walletService.adminSignAndSubmitTransaction(tx);
      executedTxn = await this.walletService.waitForTransaction(committedTxn.hash);
    } else {
      const tx = await this.coreContractService.createResourceAccountAndMintTokenSimple({
        sender: this.walletService.admin.accountAddress,
        userAccountHash: command.userAccountHash,
        uniId: command.uniId,
        amount: new BigNumber(command.amount),
      });
      const committedTxn = await this.walletService.adminSignAndSubmitTransaction(tx);
      executedTxn = await this.walletService.waitForTransaction(committedTxn.hash);
    }

    await this.metricsService.putMetrics([
      this.metricsService.createMetricData('totalTransactions', 1, StandardUnit.Count, [
        {
          Name: 'success',
          Value: executedTxn.success.toString(),
        },
      ]),
    ]);

    this.logger.log(`[handleRelayAccount] create resource account hash: ${executedTxn.hash} done`);
  }

  private async handleRelayToken() {
    const batch = 10;
    const txs: InputGenerateTransactionPayloadData[] = [];
    for (let i = 0; i < batch; i++) {
      const commandStr = await this.redisService.lpop(this.commandTokenRedisKey);
      if (!commandStr) {
        break;
      }

      await this.handleCommand(txs, commandStr);
    }
    if (txs.length === 0) {
      // this.logger.log('[handleRelayToken] do not have new transactions, return');
      return;
    }

    this.aptos.transaction.batch.forSingleAccount({ sender: this.walletService.operator, data: txs });
    this.aptos.transaction.batch.on(TransactionWorkerEventsEnum.TransactionSent, async (data) => {
      this.logger.log(`[handleRelayToken] transaction sent, hash: ${data.transactionHash}`);
    });
    let success = 0;
    this.aptos.transaction.batch.on(TransactionWorkerEventsEnum.TransactionExecuted, async (data) => {
      this.logger.log(`[handleRelayToken] transaction executed, hash: ${data.transactionHash}`);
      success++;
    });

    let executing = true;
    this.aptos.transaction.batch.on(TransactionWorkerEventsEnum.ExecutionFinish, async () => {
      this.logger.log(`[handleRelayToken] success: ${success}, total: ${txs.length}`);
      executing = false;
      this.aptos.transaction.batch.removeAllListeners();
    });

    while (executing) {
      await this.timeService.sleep(500);
    }

    const metrics: MetricDatum[] = [
      this.metricsService.createMetricData('totalTransactions', success, StandardUnit.Count, [
        {
          Name: 'success',
          Value: 'true',
        },
      ]),
    ];
    const failedTxCount = txs.length - success;
    metrics.push(
      this.metricsService.createMetricData('totalTransactions', failedTxCount, StandardUnit.Count, [
        {
          Name: 'success',
          Value: 'false',
        },
      ]),
    );
    await this.metricsService.putMetrics(metrics);

    this.logger.log(`[handleRelayToken] done`);
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
      case 'task_bonus':
        await this.handleTaskToken(txs, {
          receipt: command.receipt,
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

  private async handleTaskToken(
    txs: InputGenerateTransactionPayloadData[],
    input: { receipt: string; uniId: string; amount: BigNumber },
  ) {
    const { receipt } = input;

    const exists = await this.coreContractService.resourceAccountExists(receipt);
    if (!exists) {
      this.logger.log(`[handleTaskToken] inviter resource account: ${receipt} not exist, return`);
    }

    await this.coreContractService.taskBonus(txs, input);
  }
}
