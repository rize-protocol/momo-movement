import { Controller, Get, Param } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { User } from 'movement-gaming-model';
import { EntityManager } from 'typeorm';

import { Admin } from '@/common/decorators/auth.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { OverviewInfoResponse } from '@/overview/dto/overview-info.response';
import { OverviewService } from '@/overview/overview.service';

@Controller('overview')
export class OverviewController {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly overviewService: OverviewService,
  ) {}

  @Get('info')
  async info(@CurrentUser() user: User) {
    let resp: OverviewInfoResponse = new OverviewInfoResponse();
    await this.entityManager.transaction(async (entityManager) => {
      resp = await this.overviewService.info(user, entityManager);
    });
    return resp;
  }

  @Admin()
  @Get('info_internal/:telegramId')
  async interInternal(@Param('telegramId') telegramId: string) {
    let resp: OverviewInfoResponse = new OverviewInfoResponse();
    await this.entityManager.transaction(async (entityManager) => {
      resp = await this.overviewService.infoInternal(telegramId, entityManager);
    });
    return resp;
  }
}
