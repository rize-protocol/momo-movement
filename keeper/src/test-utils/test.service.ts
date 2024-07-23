import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

import { CoreContractService } from '@/core-contract/core-contract.service';
import { WalletService } from '@/wallet/wallet.service';

@Injectable()
export class TestService {
  constructor(
    private readonly configService: ConfigService,
    private readonly coreContractService: CoreContractService,
    private readonly walletService: WalletService,
    @InjectEntityManager() public readonly entityManager: EntityManager,
  ) {}

  async clear() {
    const entities = this.entityManager.connection.entityMetadatas;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const repo = this.entityManager.getRepository(entity.name);
      await repo.clear();
    }
  }

  async tryCreateResourceAccount(userAccountHash: string) {
    const resourceAccountBeforeCreated = await this.coreContractService.tryGetUserResourceAccount(userAccountHash);
    if (resourceAccountBeforeCreated) {
      return;
    }

    const tx = await this.coreContractService.createResourceAccount(userAccountHash);

    const simulateRes = await this.walletService.simulateTransaction(tx);
    if (!simulateRes.success) {
      throw new Error(`[tryCreateResourceAccount] simulate error: ${JSON.stringify(simulateRes, null, 2)}`);
    }

    const committedTxn = await this.walletService.signAndSubmitTransaction(tx);
    await this.walletService.waitForTransaction(committedTxn.hash);
    console.log(`[tryCreateResourceAccount] create resource account hash: ${committedTxn.hash} done`);
  }
}
