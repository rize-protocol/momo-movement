import { Module } from '@nestjs/common';

import { CommandService } from '@/command/command.service';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [CommonModule],
  providers: [CommandService],
  exports: [CommandService],
})
export class CommandModule {}
