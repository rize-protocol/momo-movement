import { IsNotEmpty, IsString } from 'class-validator';

export class BindReferralInternalRequest {
  @IsString()
  @IsNotEmpty()
  referralCode: string;
}
