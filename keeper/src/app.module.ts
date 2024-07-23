import { Module } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';
import { CoreContractModule } from '@/core-contract/core-contract.module';
import { Web3Module } from '@/web3/web3.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [CommonModule, Web3Module, CoreContractModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
