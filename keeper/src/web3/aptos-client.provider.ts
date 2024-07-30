import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MovementAptosConfig } from '@/common/config/types';

export const aptosClientProvider: FactoryProvider = {
  provide: Aptos,
  useFactory: async (configService: ConfigService) => {
    const movementAptosConfig = configService.get<MovementAptosConfig>('aptos');
    if (!movementAptosConfig) {
      throw new Error('Missing aptos config');
    }

    const config = new AptosConfig({
      network: Network.CUSTOM,
      fullnode: movementAptosConfig.clientUrl,
      faucet: movementAptosConfig.faucet,
      indexer: movementAptosConfig.indexer,
    });

    return new Aptos(config);
  },
  inject: [ConfigService],
};
