import { Module } from '@nestjs/common';

import { CampaignController } from '@/campaign/campaign.controller';
import { CampaignService } from '@/campaign/campaign.service';
import { CommonModule } from '@/common/common.module';
import { InvitationModule } from '@/invitation/invitation.module';

@Module({
  imports: [CommonModule, InvitationModule],
  controllers: [CampaignController],
  providers: [CampaignService],
  exports: [CampaignService],
})
export class CampaignModule {}
