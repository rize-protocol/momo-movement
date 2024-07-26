import { Module } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';
import { GameModule } from '@/game/game.module';
import { TaskController } from '@/task/task.controller';
import { TaskService } from '@/task/task.service';

@Module({
  imports: [CommonModule, GameModule],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
