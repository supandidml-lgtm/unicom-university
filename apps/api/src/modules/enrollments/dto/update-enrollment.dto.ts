import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdateEnrollmentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  plannedWeekCount!: number;
}
