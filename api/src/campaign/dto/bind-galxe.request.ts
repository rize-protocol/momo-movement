import { IsNotEmpty, IsString } from 'class-validator';

export class BindGalxeRequest {
  @IsString()
  @IsNotEmpty()
  code: string;
}
