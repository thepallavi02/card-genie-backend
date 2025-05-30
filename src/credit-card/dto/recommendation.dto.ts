import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class GetRecommendationRequestDto {
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  preferences?: string;

  @IsOptional()
  @IsString()
  spendingPattern?: string;
}
