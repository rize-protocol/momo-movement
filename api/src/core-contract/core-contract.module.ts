import { Module } from '@nestjs/common';

import { CoreContractService } from '@/core-contract/core-contract.service';
import { Web3Module } from '@/web3/web3.module';

@Module({
  imports: [Web3Module],
  providers: [CoreContractService],
})
export class CoreContractModule {}
