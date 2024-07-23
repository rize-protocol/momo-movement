import { GetSecretValueCommand, SecretsManager } from '@aws-sdk/client-secrets-manager';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SecretManagerConfig, SourceType, SourceValue } from '@/common/config/types';
import { ISecretManagerService } from '@/common/services/interface';

@Injectable()
export class SecretManagerService implements ISecretManagerService {
  private readonly secretManager: SecretsManager;

  constructor(configService: ConfigService) {
    const smc = configService.get<SecretManagerConfig>('secret-manager');
    if (!smc) {
      throw new Error('Secret manager config not found');
    }
    this.secretManager = new SecretsManager({ region: smc.region });
  }

  async getConfigValue(sv: SourceValue) {
    switch (sv.source) {
      case SourceType.UseValue:
        return sv.value;
      case SourceType.SecretManager:
        return this.getSecret(sv.value);
      default:
        throw new Error(`Unknown config source type: ${sv.source}`);
    }
  }

  private async getSecret(secretKey: string) {
    const command = new GetSecretValueCommand({ SecretId: secretKey });
    const data = await this.secretManager.send(command);
    return data.SecretString;
  }
}
