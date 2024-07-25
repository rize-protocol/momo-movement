import { Module } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';
import { GameModule } from '@/game/game.module';
import { InvitationService } from '@/invitation/invitation.service';
import { MomoModule } from '@/momo/momo.module';

@Module({
  imports: [CommonModule, GameModule, MomoModule],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
