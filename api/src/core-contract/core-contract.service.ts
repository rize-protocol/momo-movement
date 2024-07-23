import { Aptos } from '@aptos-labs/ts-sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CoreContractService {
  constructor(
    private readonly configService: ConfigService,
    private readonly aptos: Aptos,
  ) {}

  async onModuleInit() {
    const tokens = await this.aptos.getAccountAPTAmount({
      accountAddress: '0x0ff15561341365ea41fe38bc19c357570d291abc03bf4b9adfba6ce6a05549d8',
    });
    console.log(tokens);
  }
}
