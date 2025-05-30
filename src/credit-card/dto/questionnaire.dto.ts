import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SubCategory {
  @IsString()
  name: string;
}

export class SpendCategory {
  @IsNotEmpty()
  @IsString()
  categoryName: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value.toString(), { toClassOnly: true })
  categoryAmount?: string;

  @IsOptional()
  @IsString()
  categoryScore?: string;

  @IsArray()
  @IsString({ each: true })
  subCategory: string[];
}

export class QuestionnaireRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpendCategory)
  spendCategory: SpendCategory[];

  @IsOptional()
  @IsString()
  incomeRange?: string;

  @IsOptional()
  @IsBoolean()
  hasCreditCard?: boolean;

  @IsOptional()
  @IsString()
  creditLimit?: string;

  @IsNotEmpty()
  @IsString()
  customerId: string;
}

export class QuestionnaireResponseDto {
  message: string;
  id: string;
}
