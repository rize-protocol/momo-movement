import { Injectable } from '@nestjs/common';
import { MomoHistory, User } from 'movement-gaming-model';
import { EntityManager } from 'typeorm';

import { CommandService } from '@/command/command.service';

@Injectable()
export class MomoService {
  constructor(private readonly commandService: CommandService) {}

  async mintMomo(
    entityManager: EntityManager,
    input: { user: User; uniId: string; momoChange: string; module: string; message: string },
  ) {
    await this.commandService.addMintToken(input.user.resourceAddress, input.uniId, input.momoChange);

    await entityManager.insert(MomoHistory, {
      userId: input.user.id!,
      telegramId: input.user.telegramId,
      momoChange: input.momoChange,
      module: input.module,
      message: input.message,
    });
  }

  async referralBonus(
    entityManager: EntityManager,
    input: { user: User; uniId: string; momoChange: string; module: string; message: string },
  ) {
    await this.commandService.addReferralToken(input.user.resourceAddress, input.uniId, input.momoChange);

    await entityManager.insert(MomoHistory, {
      userId: input.user.id!,
      telegramId: input.user.telegramId,
      momoChange: input.momoChange,
      module: input.module,
      message: input.message,
    });
  }
}
