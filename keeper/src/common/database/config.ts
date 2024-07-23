import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';

import { RawDatabaseConfig } from '@/common/config/types';
import { IConfigService, ISecretManagerService } from '@/common/services/interface';

export async function getDatabaseConfig(
  config: IConfigService,
  secretManager: ISecretManagerService,
): Promise<MysqlConnectionOptions> {
  const rawConfig = config.get<RawDatabaseConfig>('database');
  if (!rawConfig) {
    throw new Error('Database config not found');
  }
  const username = await secretManager.getConfigValue(rawConfig.username);
  if (!username) {
    throw new Error('Database username config not found');
  }
  const password = await secretManager.getConfigValue(rawConfig.password);
  if (password === undefined) {
    throw new Error('Database password config not found');
  }
  return {
    type: 'mysql',
    database: rawConfig.name,
    host: rawConfig.host,
    port: rawConfig.port,
    logging: rawConfig.logging,
    username,
    password,
  };
}
