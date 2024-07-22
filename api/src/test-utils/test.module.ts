import { Module } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';
import { TestService } from '@/test-utils/test.service';

@Module({
  imports: [CommonModule],
  providers: [TestService],
  exports: [TestService],
})
export class TestModule {}
