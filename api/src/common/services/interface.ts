import { SourceValue } from '@/common/config/types';

export interface IConfigService {
  get<T>(key: string): T;
}

export interface ISecretManagerService {
  getConfigValue(sv: SourceValue): Promise<string | undefined>;
}
