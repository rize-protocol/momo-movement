import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common/common.module';
import { CoreContractModule } from '@/core-contract/core-contract.module';
import { UserModule } from '@/user/user.module';
import { Web3Module } from '@/web3/web3.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [CommonModule, AuthModule, Web3Module, CoreContractModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
