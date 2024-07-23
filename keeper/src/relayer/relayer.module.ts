import { Module } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';
import { CoreContractModule } from '@/core-contract/core-contract.module';
import { RelayerService } from '@/relayer/relayer.service';
import { WalletModule } from '@/wallet/wallet.module';

@Module({
  imports: [CommonModule, CoreContractModule, WalletModule],
  providers: [RelayerService],
})
export class RelayerModule {}
