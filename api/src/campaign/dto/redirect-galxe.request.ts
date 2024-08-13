import { IsNotEmpty, IsString } from 'class-validator';

export class RedirectGalxeRequest {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  state: string;
}
