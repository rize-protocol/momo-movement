import { readFileSync } from 'fs';
import { resolve } from 'path';

import { load } from 'js-yaml';

import { AppConfig } from '@/common/config/types';

export function loadConfig(): AppConfig {
  const configFile = configFilePath();
  const content = readFileSync(configFile, 'utf-8');
  return load(content) as AppConfig;
}

export function configFilePath() {
  return resolve(__dirname, '../../../config/config.yaml');
}
