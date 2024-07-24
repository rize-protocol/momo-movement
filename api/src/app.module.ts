import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { CommandModule } from '@/command/command.module';
import { CommonModule } from '@/common/common.module';
import { CoreContractModule } from '@/core-contract/core-contract.module';
import { GameModule } from '@/game/game.module';
import { OverviewModule } from '@/overview/overview.module';
import { UserModule } from '@/user/user.module';
import { Web3Module } from '@/web3/web3.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    Web3Module,
    CoreContractModule,
    UserModule,
    CommandModule,
    GameModule,
    OverviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
