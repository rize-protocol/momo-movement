import { Module } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';
import { GameModule } from '@/game/game.module';
import { InvitationController } from '@/invitation/invitation.controller';
import { InvitationService } from '@/invitation/invitation.service';
import { MomoModule } from '@/momo/momo.module';

@Module({
  imports: [CommonModule, GameModule, MomoModule],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
