import { Module } from '@nestjs/common';

import { CommandModule } from '@/command/command.module';
import { CommonModule } from '@/common/common.module';
import { MomoService } from '@/momo/momo.service';

@Module({
  imports: [CommonModule, CommandModule],
  providers: [MomoService],
  exports: [MomoService],
})
export class MomoModule {}
