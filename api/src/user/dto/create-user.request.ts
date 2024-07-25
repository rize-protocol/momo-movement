import { IsString } from 'class-validator';

export class CreateUserRequest {
  @IsString()
  referralCode: string;
}
