import { IsNotEmpty, IsString } from 'class-validator';

export class CheckGalxeAddressRequest {
  @IsString()
  @IsNotEmpty()
  address: string;
}
