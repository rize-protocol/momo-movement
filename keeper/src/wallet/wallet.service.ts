import { Account, AnyRawTransaction, Aptos, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SourceValue } from '@/common/config/types';
import { SecretManagerService } from '@/common/services/secret-manager.service';

@Injectable()
export class WalletService implements OnModuleInit {
  private operatorAccount: Account;

  constructor(
    private readonly configService: ConfigService,
    private readonly secretManagerService: SecretManagerService,
    private readonly aptos: Aptos,
  ) {}

  async onModuleInit() {
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

  async signAndSubmitTransaction(transaction: AnyRawTransaction) {
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
}
