import { Body, Controller, Get, Post, Query, Redirect } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { User } from 'movement-gaming-model';
import { EntityManager } from 'typeorm';

import { CampaignService } from '@/campaign/campaign.service';
import { BindGalxeRequest } from '@/campaign/dto/bind-galxe.request';
import { BindReferralInternalRequest } from '@/campaign/dto/bind-referral-internal.request';
import { CheckGalxeAddressRequest } from '@/campaign/dto/check-galxe-address.request';
import { CheckIntractRequest } from '@/campaign/dto/check-Intract.request';
import { CheckSecure3Request } from '@/campaign/dto/check-secure3.request';
import { RedirectGalxeRequest } from '@/campaign/dto/redirect-galxe.request';
import { Admin, Public } from '@/common/decorators/auth.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('campaign')
export class CampaignController {
  private readonly galxeRedirectUrl = 'https://t.me/MomoByRizeBot/momo?startapp=';

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly campaignService: CampaignService,
  ) {}

  @Admin()
  @Post('bind_referral_internal')
  async bindReferralInternal(@Body() request: BindReferralInternalRequest) {
    await this.entityManager.transaction(async (entityManager) => {
      await this.campaignService.bindReferralCodeInternal(request.referralCode, entityManager);
    });
  }

  @Admin()
  @Get('referral_list_internal')
  async referralListInternal() {
    return this.campaignService.referralListInternal(this.entityManager);
  }

  @Post('bind_galxe')
  async bindGalxe(@CurrentUser() user: User, @Body() request: BindGalxeRequest) {
    await this.entityManager.transaction(async (entityManager) => {
      await this.campaignService.bindGalxeEvmAddress(entityManager, {
        userId: user.id!,
        telegramId: user.telegramId,
        code: request.code,
      });
    });
  }

  @Public()
  @Get('galxe_user_exist')
  async galxeUserExist(@Query() request: CheckGalxeAddressRequest) {
    return this.campaignService.galxeUserExist(this.entityManager, request.address);
  }

  @Public()
  @Get('galxe_check_activity')
  async galxeCheckActivity(@Query() request: CheckGalxeAddressRequest) {
    return this.campaignService.galxeCheckActivity(this.entityManager, request.address);
  }

  @Public()
  @Get('galxe_redirect')
  @Redirect()
  async galxeRedirect(@Query() request: RedirectGalxeRequest) {
    const { code, state } = request;
    const redirectUrl = `${this.galxeRedirectUrl}${code}&state=${state}`;

    return { url: redirectUrl, statusCode: 302 };
  }

  @Public()
  @Get('secure3_check')
  async secure3Check(@Query() request: CheckSecure3Request) {
    return this.campaignService.secure3Check(this.entityManager, request.telegramId);
  }

  @Public()
  @Post('intract_check')
  async intractCheck(@Body() request: CheckIntractRequest) {
    return this.campaignService.intractCheck(this.entityManager, request.telegram);
  }
}
