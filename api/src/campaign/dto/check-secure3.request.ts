import { IsNotEmpty, IsString } from 'class-validator';

export class CheckSecure3Request {
  @IsString()
  @IsNotEmpty()
  telegramId: string;
}
