import { Module } from '@nestjs/common';

import { CampaignModule } from '@/campaign/campaign.module';
import { CommandModule } from '@/command/command.module';
import { CommonModule } from '@/common/common.module';
import { CoreContractModule } from '@/core-contract/core-contract.module';
import { GameModule } from '@/game/game.module';
import { InvitationModule } from '@/invitation/invitation.module';
import { UserController } from '@/user/user.controller';
import { UserService } from '@/user/user.service';

@Module({
  imports: [CommonModule, CommandModule, CoreContractModule, InvitationModule, GameModule, CampaignModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
