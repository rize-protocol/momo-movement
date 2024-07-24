import { Module } from '@nestjs/common';

import { CommandModule } from '@/command/command.module';
import { CommonModule } from '@/common/common.module';
import { CoreContractModule } from '@/core-contract/core-contract.module';
import { UserController } from '@/user/user.controller';
import { UserService } from '@/user/user.service';

@Module({
  imports: [CommonModule, CommandModule, CoreContractModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
