import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUserInternalRequest {
  @IsString()
  @IsNotEmpty()
  telegramId: string;

  @IsString()
  referralCode: string;
}
