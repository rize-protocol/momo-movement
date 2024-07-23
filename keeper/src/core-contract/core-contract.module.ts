import { Module } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';
import { CoreContractService } from '@/core-contract/core-contract.service';
import { WalletModule } from '@/wallet/wallet.module';
import { Web3Module } from '@/web3/web3.module';

@Module({
  imports: [CommonModule, Web3Module, WalletModule],
  providers: [CoreContractService],
  exports: [CoreContractService],
})
export class CoreContractModule {}
