import { readFileSync } from 'fs';
import { resolve } from 'path';

import { GetSecretValueCommand, SecretsManager } from '@aws-sdk/client-secrets-manager';
import { load } from 'js-yaml';
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';

const secretManager = new SecretsManager({ region: 'us-west-1' });

export async function getDatabaseConfig(): Promise<MysqlConnectionOptions> {
  const rawConfig: any = loadConfig();
  const rawDBConfig = rawConfig.database;
  if (!rawDBConfig) {
    throw new Error('Database config not found');
  }

  const username = await getConfigValue(rawDBConfig.username);
  if (!username) {
    throw new Error('Database username config not found');
  }
  const password = await getConfigValue(rawDBConfig.password);
  if (password === undefined) {
    throw new Error('Database password config not found');
  }

  return {
    type: 'mysql',
    database: rawDBConfig.name,
    host: rawDBConfig.host,
    port: rawDBConfig.port,
    logging: rawDBConfig.logging,
    username,
    password,
    entities: [`${__dirname}/../../model/src/**/*.entity.ts`],
    synchronize: false,
    dropSchema: false,
  };
}

export async function getConfigValue(sv: SourceValue) {
  switch (sv.source) {
    case SourceType.UseValue:
      return sv.value;
    case SourceType.SecretManager:
      return getSecret(sv.value);
    default:
      throw new Error(`Unknown config source type: ${sv.source}`);
  }
}

export async function getSecret(secretKey: string) {
  const command = new GetSecretValueCommand({ SecretId: secretKey });
  const data = await secretManager.send(command);
  return data.SecretString;
}

export function loadConfig() {
  const configFile = configFilePath();
  const content = readFileSync(configFile, 'utf-8');
  return load(content);
}

export function configFilePath() {
  return resolve(__dirname, '../../api/config/config.yaml');
}

export interface SourceValue {
  source: SourceType;
  value: string;
}

export enum SourceType {
  SecretManager = 'secret-manager',
  UseValue = 'use-value',
}
