import { Injectable } from '@nestjs/common';
import { User } from 'movement-gaming-model';
import { EntityManager } from 'typeorm';

import { CoreContractService } from '@/core-contract/core-contract.service';
import { GameService } from '@/game/game.service';
import { InvitationService } from '@/invitation/invitation.service';
import { OverviewInfoResponse } from '@/overview/dto/overview-info.response';
import { UserService } from '@/user/user.service';

@Injectable()
export class OverviewService {
  constructor(
    private readonly userService: UserService,
    private readonly gameService: GameService,
    private readonly invitationService: InvitationService,
    private readonly coreContractService: CoreContractService,
  ) {}

  async info(user: User, entityManager: EntityManager): Promise<OverviewInfoResponse> {
    const gameInfo = await this.gameService.getPlayInfo(user, entityManager);
    const invitationInfo = await this.invitationService.getUserInvitationInfo(user, entityManager);
    const coinBalance = await this.coreContractService.momoBalance(user.resourceAddress);

    return {
      user: {
        telegramId: user.telegramId,
        accountHash: user.accountHash,
        resourceAddress: user.resourceAddress,
      },
      game: gameInfo,
      invitation: invitationInfo,
      coins: coinBalance.toFixed(),
    };
  }

  async infoInternal(telegramId: string, entityManager: EntityManager) {
    const user = await this.userService.mustGetUserByTelegramId(telegramId, entityManager);
    return this.info(user, entityManager);
  }
}
