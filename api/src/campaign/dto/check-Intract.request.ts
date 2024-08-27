import { IsNotEmpty, IsString } from 'class-validator';

export class CheckIntractRequest {
  @IsString()
  @IsNotEmpty()
  telegram: string;
}
