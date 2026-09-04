import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EnrollmentStatus } from '@unicom/database';

export const reportSortKeys = [
  'fullName',
  'brand',
  'status',
  'overallProgress',
  'startedAt',
  'completedAt',
] as const;

export class ParticipantReportQueryDto {
  @IsOptional() @IsUUID('4') brandId?: string;
  @IsOptional() @IsUUID('4') curriculumVersionId?: string;
  @IsOptional() @IsEnum(EnrollmentStatus) status?: EnrollmentStatus;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsDateString() startedFrom?: string;
  @IsOptional() @IsDateString() startedTo?: string;
  @IsOptional() @IsDateString() completedFrom?: string;
  @IsOptional() @IsDateString() completedTo?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10_000) minProgressBasisPoints?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10_000) maxProgressBasisPoints?: number;
  @IsOptional() @IsIn(reportSortKeys) sort?: (typeof reportSortKeys)[number];
  @IsOptional() @IsIn(['asc', 'desc']) direction?: 'asc' | 'desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}
