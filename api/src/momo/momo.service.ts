import { Injectable } from '@nestjs/common';
import { User } from 'movement-gaming-model';

import { CommandService } from '@/command/command.service';

@Injectable()
export class MomoService {
  constructor(private readonly commandService: CommandService) {}

  async mintMomo(input: { user: User; uniId: string; momoChange: string }) {
    await this.commandService.addMintToken(input.user.resourceAddress, input.uniId, input.momoChange);
  }

  async referralBonus(input: { user: User; uniId: string; momoChange: string }) {
    await this.commandService.addReferralToken(input.user.resourceAddress, input.uniId, input.momoChange);
  }

  async taskBonus(input: { user: User; uniId: string; momoChange: string }) {
    await this.commandService.addTaskToken(input.user.resourceAddress, input.uniId, input.momoChange);
  }
}
