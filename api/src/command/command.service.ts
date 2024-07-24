import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Command } from '@/command/types';
import { RelayerConfig } from '@/common/config/types';
import { RedisService } from '@/common/services/redis.service';

@Injectable()
export class CommandService {
  private readonly commandRedisKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    const relayerConfig = this.configService.get<RelayerConfig>('relayer');
    if (!relayerConfig) {
      throw new Error('relayer config not found');
    }
    this.commandRedisKey = relayerConfig.commandRedisKey;
  }

  async addCreateResourceAccount(userAccountHash: string) {
    const command: Command = { type: 'create_resource_account', userAccountHash };
    return this.pushCommand(command);
  }

  async addMintToken(receipt: string, uniId: string, amount: string) {
    const command: Command = { type: 'mint_token', receipt, uniId, amount };
    return this.pushCommand(command);
  }

  async addTransferToken(from: string, to: string, uniId: string, amount: string) {
    const command: Command = { type: 'transfer_token', from, to, uniId, amount };
    return this.pushCommand(command);
  }

  async addReferralToken(inviter: string, uniId: string, amount: string) {
    const command: Command = { type: 'referral_bonus', inviter, uniId, amount };
    return this.pushCommand(command);
  }

  private async pushCommand(command: Command) {
    this.redisService.rpush(this.commandRedisKey, JSON.stringify(command));
  }
}
