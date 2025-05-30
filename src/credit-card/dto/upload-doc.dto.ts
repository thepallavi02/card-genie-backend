import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UploadDocRequestDto {

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  customerId: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  cardBank: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  cardName: string;

}

export class UploadDocResponseDto {
  message: string;
  documentIds?: string[];
}
