import { MaterialType } from '@unicom/database';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMaterialDto {
  @IsEnum(MaterialType)
  type!: MaterialType;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;
}
