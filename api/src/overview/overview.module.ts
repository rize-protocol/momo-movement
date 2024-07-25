import { Module } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';
import { CoreContractModule } from '@/core-contract/core-contract.module';
import { GameModule } from '@/game/game.module';
import { InvitationModule } from '@/invitation/invitation.module';
import { OverviewController } from '@/overview/overview.controller';
import { OverviewService } from '@/overview/overview.service';
import { UserModule } from '@/user/user.module';

@Module({
  imports: [CommonModule, UserModule, GameModule, CoreContractModule, InvitationModule],
  controllers: [OverviewController],
  providers: [OverviewService],
  exports: [OverviewService],
})
export class OverviewModule {}
