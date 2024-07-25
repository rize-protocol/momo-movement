import { Module } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';
import { TestService } from '@/test-utils/test.service';
import { UserModule } from '@/user/user.module';

@Module({
  imports: [CommonModule, UserModule],
  providers: [TestService],
  exports: [TestService],
})
export class TestModule {}
