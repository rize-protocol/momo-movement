import { Injectable } from '@nestjs/common';
import { User } from 'movement-gaming-model';
import { EntityManager } from 'typeorm';

import { CoreContractService } from '@/core-contract/core-contract.service';
import { GameService } from '@/game/game.service';
import { OverviewInfoResponse } from '@/overview/dto/overview-info.response';

@Injectable()
export class OverviewService {
  constructor(
    private readonly gameService: GameService,
    private readonly coreContractService: CoreContractService,
  ) {}

  async info(user: User, entityManager: EntityManager): Promise<OverviewInfoResponse> {
    const [gameInfo, coinBalance] = await Promise.all([
      this.gameService.getPlayInfo(user, entityManager),
      this.coreContractService.momoBalance(user.resourceAddress),
    ]);

    return {
      user: {
        telegramId: user.telegramId,
        accountHash: user.accountHash,
        resourceAddress: user.resourceAddress,
      },
      game: {
        total: gameInfo.total,
        remaining: gameInfo.remaining,
        replenishmentIn: gameInfo.replenishmentIn,
      },
      coins: coinBalance.toFixed(),
    };
  }
}
