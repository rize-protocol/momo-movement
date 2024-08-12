import { IsNotEmpty, IsString } from 'class-validator';

export class BindGalxeRequest {
  @IsString()
  @IsNotEmpty()
  evmAddress: string;
}
