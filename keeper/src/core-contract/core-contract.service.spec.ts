import {
  Account,
  Aptos,
  InputGenerateTransactionPayloadData,
  TransactionWorkerEventsEnum,
  Ed25519PrivateKey,
} from '@aptos-labs/ts-sdk';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import BigNumber from 'bignumber.js';
import { nanoid } from 'nanoid';

import { CommonModule } from '@/common/common.module';
import { SourceValue } from '@/common/config/types';
import { TimeService } from '@/common/services/time.service';
import { CoreContractModule } from '@/core-contract/core-contract.module';
import { CoreContractService } from '@/core-contract/core-contract.service';
import { TestHelper } from '@/test-utils/helper';
import { TestModule } from '@/test-utils/test.module';
import { TestService } from '@/test-utils/test.service';
import { WalletModule } from '@/wallet/wallet.module';
import { WalletService } from '@/wallet/wallet.service';

describe('coreContractService test', () => {
  let app: INestApplication;

  let aptos: Aptos;
  let testService: TestService;
  let coreContractService: CoreContractService;
  let walletService: WalletService;
  let timeService: TimeService;

  beforeAll(async () => {
    const res = await TestHelper.build({
      imports: [CommonModule, TestModule, CoreContractModule, WalletModule],
    });

    app = res.app;

    aptos = app.get<Aptos>(Aptos);
    if (!aptos) {
      throw new Error('Failed to initialize Aptos');
    }
    testService = app.get<TestService>(TestService);
    if (!testService) {
      throw new Error('Failed to initialize TestService');
    }
    coreContractService = app.get<CoreContractService>(CoreContractService);
    if (!coreContractService) {
      throw new Error('Failed to initialize CoreContractService');
    }
    walletService = app.get<WalletService>(WalletService);
    if (!walletService) {
      throw new Error('Failed to initialize WalletService');
    }
    timeService = app.get<TimeService>(TimeService);
    if (!timeService) {
      throw new Error('Failed to initialize TimeService');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('create resource account', async () => {
    const userAccountHash = new Date().getTime().toString();
    console.log(`userAccountHash: ${userAccountHash}`);

    await testService.tryCreateResourceAccount(userAccountHash);

    const resourceAddress = await coreContractService.tryGetUserResourceAccount(userAccountHash);
    expect(resourceAddress).toBeDefined();
  });

  it('mint token', async () => {
    const userAccountHash = '0x573f6fbb07444f87bf38152319b49fb7b0d782dbada7b1c0c26b2c63b72ec954';
    await testService.tryCreateResourceAccount(userAccountHash);

    const resourceAccount = await coreContractService.tryGetUserResourceAccount(userAccountHash);
    console.log(`resourceAccount: ${resourceAccount}`);
    expect(resourceAccount).toBeDefined();

    const balanceBeforeMint = await coreContractService.momoBalance(resourceAccount!);

    const uniId = nanoid();
    const mintAmount = new BigNumber(100);

    const txs: InputGenerateTransactionPayloadData[] = [];
    await coreContractService.mintToken(txs, {
      receipt: resourceAccount!,
      uniId,
      amount: mintAmount,
    });

    aptos.transaction.batch.forSingleAccount({ sender: walletService.operator, data: txs });
    aptos.transaction.batch.on(TransactionWorkerEventsEnum.TransactionSent, async (data) => {
      console.log(`transaction sent, hash: ${data.transactionHash}`);
    });
    aptos.transaction.batch.on(TransactionWorkerEventsEnum.TransactionExecuted, async (data) => {
      console.log(`transaction executed, hash: ${data.transactionHash}`);
    });
    await timeService.sleep(5000);

    const balanceAfterMint = await coreContractService.momoBalance(resourceAccount!);
    expect(balanceAfterMint.minus(balanceBeforeMint).isEqualTo(mintAmount)).toBeTruthy();
  });

  it('batch mint token', async () => {
    const userAccountHash1 = 'hash_test1';
    await testService.tryCreateResourceAccount(userAccountHash1);
    const resourceAccount1 = await coreContractService.tryGetUserResourceAccount(userAccountHash1);
    expect(resourceAccount1).toBeDefined();
    const balanceBeforeMint1 = await coreContractService.momoBalance(resourceAccount1!);
    console.log(`resourceAccount1: ${resourceAccount1}, balanceBeforeMint1: ${balanceBeforeMint1}`);

    const userAccountHash2 = 'hash_test2';
    await testService.tryCreateResourceAccount(userAccountHash2);
    const resourceAccount2 = await coreContractService.tryGetUserResourceAccount(userAccountHash2);
    expect(resourceAccount2).toBeDefined();
    const balanceBeforeMint2 = await coreContractService.momoBalance(resourceAccount2!);
    console.log(`resourceAccount2: ${resourceAccount2}, balanceBeforeMint2: ${balanceBeforeMint2}`);

    const mintAmount = new BigNumber(100);

    const txs: InputGenerateTransactionPayloadData[] = [];
    await coreContractService.mintToken(txs, { receipt: resourceAccount1!, uniId: nanoid(), amount: mintAmount });
    await coreContractService.mintToken(txs, { receipt: resourceAccount2!, uniId: nanoid(), amount: mintAmount });

    aptos.transaction.batch.forSingleAccount({ sender: walletService.operator, data: txs });
    aptos.transaction.batch.on(TransactionWorkerEventsEnum.TransactionSent, async (data) => {
      console.log(`transaction sent, hash: ${data.transactionHash}`);
    });
    aptos.transaction.batch.on(TransactionWorkerEventsEnum.TransactionExecuted, async (data) => {
      console.log(`transaction executed, hash: ${data.transactionHash}`);
    });
    await timeService.sleep(5000);

    const balanceAfterMint1 = await coreContractService.momoBalance(resourceAccount1!);
    const balanceAfterMint2 = await coreContractService.momoBalance(resourceAccount2!);
    expect(balanceAfterMint1.minus(balanceBeforeMint1).isEqualTo(mintAmount)).toBeTruthy();
    expect(balanceAfterMint2.minus(balanceBeforeMint2).isEqualTo(mintAmount)).toBeTruthy();
  });

  it('transfer token', async () => {
    const userAccountHash = 'hash_test1';
    await testService.tryCreateResourceAccount(userAccountHash);
    const resourceAccount = await coreContractService.tryGetUserResourceAccount(userAccountHash);
    expect(resourceAccount).toBeDefined();
    const balanceBeforeTransfer = await coreContractService.momoBalance(resourceAccount!);
    console.log(`resourceAccount: ${resourceAccount}, balanceBeforeTransfer: ${balanceBeforeTransfer}`);

    const receiptAddress = Account.generate().accountAddress.toString();
    const transferAmount = new BigNumber(50);

    const uniId = nanoid();
    const txs: InputGenerateTransactionPayloadData[] = [];
    await coreContractService.transferToken(txs, {
      from: resourceAccount!,
      to: receiptAddress,
      uniId,
      amount: transferAmount,
    });

    aptos.transaction.batch.forSingleAccount({ sender: walletService.operator, data: txs });
    aptos.transaction.batch.on(TransactionWorkerEventsEnum.TransactionSent, async (data) => {
      console.log(`transaction sent, hash: ${data.transactionHash}`);
    });
    aptos.transaction.batch.on(TransactionWorkerEventsEnum.TransactionExecuted, async (data) => {
      console.log(`transaction executed, hash: ${data.transactionHash}`);
    });
    await timeService.sleep(5000);

    const balanceAfterTransfer = await coreContractService.momoBalance(resourceAccount!);
    expect(balanceBeforeTransfer.minus(balanceAfterTransfer).isEqualTo(transferAmount)).toBeTruthy();

    const receiptBalance = await coreContractService.momoBalance(receiptAddress);
    expect(receiptBalance.isEqualTo(transferAmount)).toBeTruthy();
  });

  it('referral bonus', async () => {
    const userAccountHash = 'hash_test1';
    await testService.tryCreateResourceAccount(userAccountHash);
    const resourceAccount = await coreContractService.tryGetUserResourceAccount(userAccountHash);
    expect(resourceAccount).toBeDefined();
    const balanceBeforeBonus = await coreContractService.momoBalance(resourceAccount!);
    console.log(`resourceAccount: ${resourceAccount}, balanceBeforeBonus: ${balanceBeforeBonus}`);

    const uniId = nanoid();
    const referralAmount = new BigNumber(50);
    const txs: InputGenerateTransactionPayloadData[] = [];
    await coreContractService.referralBonus(txs, { inviter: resourceAccount!, uniId, amount: referralAmount });

    aptos.transaction.batch.forSingleAccount({ sender: walletService.operator, data: txs });
    aptos.transaction.batch.on(TransactionWorkerEventsEnum.TransactionSent, async (data) => {
      console.log(`transaction sent, hash: ${data.transactionHash}`);
    });
    aptos.transaction.batch.on(TransactionWorkerEventsEnum.TransactionExecuted, async (data) => {
      console.log(`transaction executed, hash: ${data.transactionHash}`);
    });
    await timeService.sleep(5000);

    const balanceAfterBonus = await coreContractService.momoBalance(resourceAccount!);
    expect(balanceAfterBonus.minus(balanceBeforeBonus).isEqualTo(referralAmount)).toBeTruthy();
  });

  it('resource account exist', async () => {
    const userAccountHash = 'hash_test1';
    await testService.tryCreateResourceAccount(userAccountHash);
    const resourceAccount = await coreContractService.tryGetUserResourceAccount(userAccountHash);
    expect(resourceAccount).toBeDefined();

    const exist = await coreContractService.resourceAccountExists(resourceAccount!);
    expect(exist).toBeTruthy();
  });

  it('add operator', async () => {
    const configService = app.get<ConfigService>(ConfigService);
    const operatorList = configService.get<SourceValue[]>('operator-list');
    if (!operatorList || operatorList.length === 0) {
      throw new Error('operator list config not found');
    }

    for (let i = 0; i < operatorList.length; i++) {
      const operator = operatorList[i];

      const privateKey = new Ed25519PrivateKey(operator.value);
      const operatorAccount = Account.fromPrivateKey({ privateKey });

      // const tx = await coreContractService.addOperator({
      //   sender: walletService.admin.accountAddress,
      //   operator: operatorAccount.accountAddress,
      // });
      //
      // const committedTxn = await walletService.adminSignAndSubmitTransaction(tx);
      // await walletService.waitForTransaction(committedTxn.hash);
      // console.log(`add operator hash: ${committedTxn.hash} done`);

      const isOperator = await coreContractService.isOperator(operatorAccount.accountAddress);
      console.log(i, operatorAccount.accountAddress.toString(), isOperator);
    }
  });

  it('operator faucet', async () => {
    const acc = Account.generate();
    console.log(acc.accountAddress.toString());
    console.log(acc.privateKey.toString());
    await aptos.faucet.fundAccount({ accountAddress: acc.accountAddress, amount: 10 * 1e8 });
  });
});
