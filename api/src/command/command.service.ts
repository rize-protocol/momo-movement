import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Command } from '@/command/types';
import { RelayerConfig } from '@/common/config/types';
import { RedisService } from '@/common/services/redis.service';

@Injectable()
export class CommandService {
  private readonly commandAccountRedisKey: string;

  private readonly commandTokenRedisKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    const relayerConfig = this.configService.get<RelayerConfig>('relayer');
    if (!relayerConfig) {
      throw new Error('relayer config not found');
    }
    this.commandAccountRedisKey = relayerConfig.commandAccountRedisKey;
    this.commandTokenRedisKey = relayerConfig.commandTokenRedisKey;
  }

  async addCreateResourceAccount(userAccountHash: string) {
    const command: Command = { type: 'create_resource_account', userAccountHash };
    return this.pushCommand(command);
  }

  async addCreateResourceAccountAndMintToken(userAccountHash: string, uniId: string, amount: string) {
    const command: Command = { type: 'create_resource_account_and_mint_token', userAccountHash, uniId, amount };
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

  async addTaskToken(receipt: string, uniId: string, amount: string) {
    const command: Command = { type: 'task_bonus', receipt, uniId, amount };
    return this.pushCommand(command);
  }

  private async pushCommand(command: Command) {
    if (command.type === 'create_resource_account' || command.type === 'create_resource_account_and_mint_token') {
      this.redisService.rpush(this.commandAccountRedisKey, JSON.stringify(command));
    } else {
      this.redisService.rpush(this.commandTokenRedisKey, JSON.stringify(command));
    }
  }
}
