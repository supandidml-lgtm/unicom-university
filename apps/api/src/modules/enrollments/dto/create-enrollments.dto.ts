import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

export class EnrollmentAssignmentDto {
  @IsUUID('4')
  brandId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  plannedWeekCount!: number;
}

export class CreateEnrollmentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EnrollmentAssignmentDto)
  enrollments!: EnrollmentAssignmentDto[];
}
