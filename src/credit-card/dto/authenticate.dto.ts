import { IsNotEmpty, IsString } from 'class-validator';

export class AuthenticateRequestDto {
  @IsNotEmpty()
  @IsString()
  token: string;
}

export class AuthenticateResponseDto {
  isValidLink: boolean;
  apiToken: string;
  customerId: string;
}