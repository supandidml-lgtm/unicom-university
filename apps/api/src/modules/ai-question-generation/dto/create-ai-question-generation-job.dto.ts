import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class AiQuestionTypeDistributionDto {
  @IsInt()
  @Min(0)
  singleChoice!: number;

  @IsInt()
  @Min(0)
  multipleChoice!: number;

  @IsInt()
  @Min(0)
  trueFalse!: number;
}

export class CreateAiQuestionGenerationJobDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  materialIds!: string[];

  @IsInt()
  @Min(1)
  @Max(100)
  questionCount!: number;

  @ValidateNested()
  @Type(() => AiQuestionTypeDistributionDto)
  questionTypes!: AiQuestionTypeDistributionDto;
}
