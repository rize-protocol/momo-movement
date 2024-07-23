import { Module } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';
import { WalletService } from '@/wallet/wallet.service';
import { Web3Module } from '@/web3/web3.module';

@Module({
  imports: [CommonModule, Web3Module],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
