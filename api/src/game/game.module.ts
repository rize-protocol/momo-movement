import { Module } from '@nestjs/common';

import { CommandModule } from '@/command/command.module';
import { CommonModule } from '@/common/common.module';
import { GameController } from '@/game/game.controller';
import { GameService } from '@/game/game.service';
import { UserModule } from '@/user/user.module';

@Module({
  imports: [CommonModule, CommandModule, UserModule],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
