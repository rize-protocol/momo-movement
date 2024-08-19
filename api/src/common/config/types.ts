export interface AppConfig {
  database: RawDatabaseConfig;
  redis: RedisConfig;
  telegram: TelegramConfig;
  'secret-manager': SecretManagerConfig;
  aptos: MovementAptosConfig;
  'core-contract': CoreContractConfig;
  relayer: RelayerConfig;
  game: GameConfig;
  invitation: InvitationConfig;
  task: TaskConfig;
  campaign: CampaignConfig;
  monitoring: MonitoringConfig;
  admin: AdminConfig;
  galxe: GalxeConfig;
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
  botToken: SourceValue;
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

export interface CoreContractConfig {
  contractId: string;
  decimals: number;
}

export interface RelayerConfig {
  commandAccountRedisKey: string;
  commandTokenRedisKey: string;
}

export interface GameConfig {
  totalPlay: number;
  replenishmentInterval: number;
  coinsPerGame: number;
  timesPerGame: number;
}

export interface InvitationConfig {
  codeLen: number;
  maxGenerateCodeTryTimes: number;
  target: Record<number, InvitationTargetConfig>;
  targetMemberNumsStep: number;
  targetRewardCoinsStep: number;
  targetRewardPlaysStep: number;
}

export interface InvitationTargetConfig {
  level: number;
  memberNums: number;
  rewardCoins: number;
  rewardPlays: number;
}

export interface TaskConfig {
  list: TaskItemConfig[];
}

export interface TaskItemConfig {
  taskId: number;
  taskName: string;
  taskLink: string;
  rewardCoins: number;
  rewardPlays: number;
}

export interface MonitoringConfig {
  metricsNamespace: string;
  region: string;
  env: string;
}

export interface CampaignConfig {
  referralCoins: number;
}

export interface AdminConfig {
  authToken: SourceValue;
}

export interface GalxeConfig {
  getAccessTokenUrl: string;
  getUserInfoUrl: string;
  clientId: SourceValue;
  clientSecret: SourceValue;
}
