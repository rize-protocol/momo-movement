import { Account, AnyRawTransaction, Aptos, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CoreContractConfig } from '@/common/config/types';
import { SecretManagerService } from '@/common/services/secret-manager.service';

@Injectable()
export class WalletService implements OnModuleInit {
  private adminAccount: Account;

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

    const privateKey = new Ed25519PrivateKey(adminPrivateKeyStr);
    this.adminAccount = Account.fromPrivateKey({ privateKey });
  }

  async signAndSubmitTransaction(transaction: AnyRawTransaction) {
    return this.aptos.signAndSubmitTransaction({
      signer: this.adminAccount,
      transaction,
    });
  }

  async simulateTransaction(transaction: AnyRawTransaction) {
    const [userTransactionResponse] = await this.aptos.transaction.simulate.simple({
      signerPublicKey: this.adminAccount.publicKey,
      transaction,
    });
    return userTransactionResponse;
  }

  async waitForTransaction(transactionHash: string) {
    return this.aptos.waitForTransaction({ transactionHash });
  }

  get admin() {
    return this.adminAccount;
  }
}
