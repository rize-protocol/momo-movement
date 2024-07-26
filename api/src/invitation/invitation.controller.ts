import { Controller, Post } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { User } from 'movement-gaming-model';
import { EntityManager } from 'typeorm';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { InvitationService } from '@/invitation/invitation.service';

@Controller('invitation')
export class InvitationController {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly invitationService: InvitationService,
  ) {}

  @Post('claim')
  async claim(@CurrentUser() user: User) {
    let res = {};
    await this.entityManager.transaction(async (entityManager) => {
      res = await this.invitationService.claimRewards(user, entityManager);
    });
    return res;
  }
}
