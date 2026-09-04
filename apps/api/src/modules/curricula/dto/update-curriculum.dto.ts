import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateCurriculumDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
