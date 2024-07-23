export interface AppConfig {
  database: RawDatabaseConfig;
  redis: RedisConfig;
  telegram: TelegramConfig;
  'secret-manager': SecretManagerConfig;
  aptos: MovementAptosConfig;
  monitoring: MonitoringConfig;
}

export interface RawDatabaseConfig {
  name: string;
  host: string;
  port: number;
  username: SourceValue;
  password: SourceValue;
  logging: boolean;
}

export interface TelegramConfig {
  botToken: string;
}

export enum SourceType {
  SecretManager = 'secret-manager',
  UseValue = 'use-value',
}

export interface SourceValue {
  source: SourceType;
  value: string;
}

export interface SecretManagerConfig {
  region: string;
}

export interface RedisConfig {
  host: string;
  port: number;
}

export interface MovementAptosConfig {
  clientUrl: string;
  network: 'mainnet' | 'testnet';
}

export interface MonitoringConfig {
  metricsNamespace: string;
  region: string;
  env: string;
}
