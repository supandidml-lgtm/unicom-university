import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdateWeekDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  weekNumber?: number;

  @IsOptional()
  @IsString()
  @Length(1, 160)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
