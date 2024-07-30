import { Module } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';
import { CoreContractModule } from '@/core-contract/core-contract.module';
import { RelayerModule } from '@/relayer/relayer.module';
import { WalletModule } from '@/wallet/wallet.module';
import { Web3Module } from '@/web3/web3.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [CommonModule, Web3Module, CoreContractModule, RelayerModule, WalletModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
