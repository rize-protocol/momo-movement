import { Body, Controller, Get, Post } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

import { CampaignService } from '@/campaign/campaign.service';
import { BindReferralInternalRequest } from '@/campaign/entity/bind-referral-internal.request';
import { Admin } from '@/common/decorators/auth.decorator';

@Controller('campaign')
export class CampaignController {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly campaignService: CampaignService,
  ) {}

  @Admin()
  @Post('bind_referral_internal')
  async bindReferralInternal(@Body() request: BindReferralInternalRequest) {
    await this.entityManager.transaction(async (entityManager) => {
      await this.campaignService.bindReferralCode(request.referralCode, entityManager);
    });
  }

  @Admin()
  @Get('referral_list_internal')
  async referralListInternal() {
    return this.campaignService.referralList(this.entityManager);
  }
}
