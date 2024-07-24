import { Controller, Get } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { User } from 'movement-gaming-model';
import { EntityManager } from 'typeorm';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { OverviewService } from '@/overview/overview.service';

@Controller('overview')
export class OverviewController {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly overviewService: OverviewService,
  ) {}

  @Get('info')
  async info(@CurrentUser() user: User) {
    return this.overviewService.info(user, this.entityManager);
  }
}
