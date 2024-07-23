import { Aptos } from '@aptos-labs/ts-sdk';
import { INestApplication } from '@nestjs/common';
import BigNumber from 'bignumber.js';

import { CommonModule } from '@/common/common.module';
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('create resource account', async () => {
    const userAccountHash = new Date().getTime().toString();
    console.log(`userAccountHash: ${userAccountHash}`);

    await testService.tryCreateResourceAccount(userAccountHash);

    const tx = await coreContractService.createResourceAccount(userAccountHash);

    const resourceAccount = await coreContractService.tryGetUserResourceAccount(userAccountHash);
    console.log(`resourceAccount: ${resourceAccount}`);
    expect(resourceAccount).toBeDefined();

    const simulateRes = await walletService.simulateTransaction(tx);
    expect(simulateRes.success).toBeFalsy();
  });

  it('mint token', async () => {
    const userAccountHash = 'hash_test1';
    await testService.tryCreateResourceAccount(userAccountHash);

    const resourceAccount = await coreContractService.tryGetUserResourceAccount(userAccountHash);
    console.log(`resourceAccount: ${resourceAccount}`);
    expect(resourceAccount).toBeDefined();

    const balanceBeforeMint = await coreContractService.momoBalance(resourceAccount!);

    const mintAmount = new BigNumber(100);
    const tx = await coreContractService.mintToken(resourceAccount!, mintAmount);
    const simulateRes = await walletService.simulateTransaction(tx);
    expect(simulateRes.success).toBeTruthy();

    const committedTxn = await walletService.signAndSubmitTransaction(tx);
    await walletService.waitForTransaction(committedTxn.hash);
    console.log(`mint token hash: ${committedTxn.hash} done`);

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

    const resourceAccountList = [resourceAccount1!, resourceAccount2!];

    const mintAmount = new BigNumber(100);
    const tx = await coreContractService.batchMintToken(resourceAccountList, mintAmount);
    const simulateRes = await walletService.simulateTransaction(tx);
    expect(simulateRes.success).toBeTruthy();

    const committedTxn = await walletService.signAndSubmitTransaction(tx);
    await walletService.waitForTransaction(committedTxn.hash);
    console.log(`batch mint token hash: ${committedTxn.hash} done`);

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

    const receiptAddress = '0xd2cf7dd5d8ac235e59c94e26262c78976024892032dc6a74e9073e6e433cff23';
    const transferAmount = new BigNumber(50);

    const tx = await coreContractService.transferToken(resourceAccount!, receiptAddress, transferAmount);
    const simulateRes = await walletService.simulateTransaction(tx);
    expect(simulateRes.success).toBeTruthy();

    const committedTxn = await walletService.signAndSubmitTransaction(tx);
    await walletService.waitForTransaction(committedTxn.hash);
    console.log(`transfer token hash: ${committedTxn.hash} done`);

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

    const referralAmount = new BigNumber(50);
    const tx = await coreContractService.referralBonus(resourceAccount!, referralAmount);
    const simulateRes = await walletService.simulateTransaction(tx);
    expect(simulateRes.success).toBeTruthy();

    const committedTxn = await walletService.signAndSubmitTransaction(tx);
    await walletService.waitForTransaction(committedTxn.hash);
    console.log(`referral bonus hash: ${committedTxn.hash} done`);

    const balanceAfterBonus = await coreContractService.momoBalance(resourceAccount!);
    expect(balanceAfterBonus.minus(balanceBeforeBonus).isEqualTo(referralAmount)).toBeTruthy();
  });
});
