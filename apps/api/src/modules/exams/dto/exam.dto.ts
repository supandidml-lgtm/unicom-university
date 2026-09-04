import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ExamQuestionType } from '@unicom/database';

export class CreateExamDto {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  @MaxLength(80)
  code!: string;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  passingScoreBasisPoints?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxAttempts?: number;

  @IsOptional()
  @IsUUID('4')
  curriculumModuleId?: string;
}

export class UpdateExamDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  passingScoreBasisPoints?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxAttempts?: number | null;
}

export class ExamQuestionOptionDto {
  @IsString()
  @MaxLength(500)
  text!: string;

  @IsBoolean()
  isCorrect!: boolean;
}

export class CreateExamQuestionDto {
  @IsEnum(ExamQuestionType)
  type!: ExamQuestionType;

  @IsString()
  @MaxLength(5_000)
  prompt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  explanation?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  points?: number;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ExamQuestionOptionDto)
  options!: ExamQuestionOptionDto[];
}

export class UpdateExamQuestionDto {
  @IsOptional()
  @IsEnum(ExamQuestionType)
  type?: ExamQuestionType;

  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  prompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  explanation?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  points?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ExamQuestionOptionDto)
  options?: ExamQuestionOptionDto[];
}

export class OrderExamQuestionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class SaveExamAnswerDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  selectedOptionIds!: string[];
}
