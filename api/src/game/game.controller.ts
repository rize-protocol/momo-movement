import { Controller, Post } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { User } from 'movement-gaming-model';
import { EntityManager } from 'typeorm';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { GameService } from '@/game/game.service';

@Controller('game')
export class GameController {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly gameService: GameService,
  ) {}

  @Post('play')
  async play(@CurrentUser() user: User) {
    let uniId: string = '';
    await this.entityManager.transaction(async (entityManager) => {
      uniId = await this.gameService.play(user, entityManager);
    });
    return { uniId };
  }
}
