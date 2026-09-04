import { IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

export class CreateCurriculumDto {
  @IsUUID('4')
  brandId!: string;

  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  @Length(2, 64)
  code!: string;

  @IsString()
  @Length(2, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
