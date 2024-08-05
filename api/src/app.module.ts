import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { CommandModule } from '@/command/command.module';
import { CommonModule } from '@/common/common.module';
import { CoreContractModule } from '@/core-contract/core-contract.module';
import { GameModule } from '@/game/game.module';
import { HealthCheckModule } from '@/health-check/health-check.module';
import { InvitationModule } from '@/invitation/invitation.module';
import { MomoModule } from '@/momo/momo.module';
import { OverviewModule } from '@/overview/overview.module';
import { TaskModule } from '@/task/task.module';
import { TelegramModule } from '@/telegram/telegram.module';
import { UserModule } from '@/user/user.module';
import { Web3Module } from '@/web3/web3.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    CommonModule,
    HealthCheckModule,
    AuthModule,
    Web3Module,
    CoreContractModule,
    UserModule,
    CommandModule,
    GameModule,
    OverviewModule,
    InvitationModule,
    MomoModule,
    TaskModule,
    TelegramModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
