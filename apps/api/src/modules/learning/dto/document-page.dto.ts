import { Type } from 'class-transformer';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class DocumentPageDto {
  @IsUUID('4')
  activitySessionId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  sequence!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  pageNumber!: number;
}
