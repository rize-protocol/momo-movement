import { Module } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';
import { CoreContractModule } from '@/core-contract/core-contract.module';
import { TestService } from '@/test-utils/test.service';
import { WalletModule } from '@/wallet/wallet.module';

@Module({
  imports: [CommonModule, CoreContractModule, WalletModule],
  providers: [TestService],
  exports: [TestService],
})
export class TestModule {}
