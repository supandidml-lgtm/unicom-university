import { IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';

export class UpdateModuleDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  @Length(2, 64)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;
}
