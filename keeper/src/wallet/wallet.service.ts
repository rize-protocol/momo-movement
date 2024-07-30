import { Account, AnyRawTransaction, Aptos, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CoreContractConfig, SourceValue } from '@/common/config/types';
import { SecretManagerService } from '@/common/services/secret-manager.service';

@Injectable()
export class WalletService implements OnModuleInit {
  private adminAccount: Account;

  private operatorAccount: Account;

  constructor(
    private readonly configService: ConfigService,
    private readonly secretManagerService: SecretManagerService,
    private readonly aptos: Aptos,
  ) {}

  async onModuleInit() {
    const coreContractConfig = this.configService.get<CoreContractConfig>('core-contract');
    if (!coreContractConfig) {
      throw new Error('core-contract config not found');
    }

    const adminPrivateKeyStr = await this.secretManagerService.getConfigValue(coreContractConfig.adminPrivateKey);
    if (!adminPrivateKeyStr) {
      throw new Error('admin private key not found');
    }

    const adminPrivateKey = new Ed25519PrivateKey(adminPrivateKeyStr);
    this.adminAccount = Account.fromPrivateKey({ privateKey: adminPrivateKey });

    const operatorList = this.configService.get<SourceValue[]>('operator-list');
    if (!operatorList) {
      throw new Error('operator-list config not found');
    }

    const instanceId = parseInt(process.env.INSTANCE_ID ?? '0', 10);

    if (instanceId >= operatorList.length) {
      throw new Error(`INSTANCE_ID: ${instanceId} >= operator list length: ${operatorList.length}`);
    }

    const operatorInfo = operatorList[instanceId];
    const operatorPrivateKeyStr = await this.secretManagerService.getConfigValue(operatorInfo);
    if (!operatorPrivateKeyStr) {
      throw new Error('operator private key not found');
    }

    const privateKey = new Ed25519PrivateKey(operatorPrivateKeyStr);
    this.operatorAccount = Account.fromPrivateKey({ privateKey });
  }

  async adminSignAndSubmitTransaction(transaction: AnyRawTransaction) {
    return this.aptos.signAndSubmitTransaction({
      signer: this.adminAccount,
      transaction,
    });
  }

  async operatorSignAndSubmitTransaction(transaction: AnyRawTransaction) {
    return this.aptos.signAndSubmitTransaction({
      signer: this.operatorAccount,
      transaction,
    });
  }

  async simulateTransaction(transaction: AnyRawTransaction) {
    const [userTransactionResponse] = await this.aptos.transaction.simulate.simple({
      signerPublicKey: this.operatorAccount.publicKey,
      transaction,
    });
    return userTransactionResponse;
  }

  async waitForTransaction(transactionHash: string) {
    return this.aptos.waitForTransaction({ transactionHash });
  }

  get operator() {
    return this.operatorAccount;
  }

  get admin() {
    return this.adminAccount;
  }
}
