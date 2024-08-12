import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { User } from 'movement-gaming-model';
import { EntityManager } from 'typeorm';

import { CampaignService } from '@/campaign/campaign.service';
import { BindGalxeRequest } from '@/campaign/dto/bind-galxe.request';
import { BindReferralInternalRequest } from '@/campaign/dto/bind-referral-internal.request';
import { CheckGalxeAddressRequest } from '@/campaign/dto/check-galxe-address.request';
import { CheckSecure3Request } from '@/campaign/dto/check-secure3.request';
import { Admin, Public } from '@/common/decorators/auth.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

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

  @Post('bind_galxe')
  async play(@CurrentUser() user: User, @Body() request: BindGalxeRequest) {
    await this.entityManager.transaction(async (entityManager) => {
      await this.campaignService.bindGalxeEvmAddress(entityManager, {
        userId: user.id!,
        telegramId: user.telegramId,
        evmAddress: request.evmAddress,
      });
    });
  }

  @Public()
  @Get('galxe_check')
  async galxeCheck(@Query() request: CheckGalxeAddressRequest) {
    return this.campaignService.galxeCheck(this.entityManager, request.address);
  }

  @Public()
  @Get('secure3_check')
  async secure3Check(@Query() request: CheckSecure3Request) {
    return this.campaignService.secure3Check(this.entityManager, request.telegramId);
  }
}
