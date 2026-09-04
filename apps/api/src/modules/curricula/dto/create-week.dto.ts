import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateWeekDto {
  @IsInt()
  @Min(1)
  weekNumber!: number;

  @IsString()
  @Length(1, 160)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
