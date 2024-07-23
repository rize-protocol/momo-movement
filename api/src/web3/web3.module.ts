import { Module } from '@nestjs/common';

import { aptosClientProvider } from '@/web3/aptos-client.provider';

@Module({
  providers: [aptosClientProvider],
  exports: [aptosClientProvider],
})
export class Web3Module {}
