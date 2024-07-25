import { Module } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';
import { GameController } from '@/game/game.controller';
import { GameService } from '@/game/game.service';
import { MomoModule } from '@/momo/momo.module';

@Module({
  imports: [CommonModule, MomoModule],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
