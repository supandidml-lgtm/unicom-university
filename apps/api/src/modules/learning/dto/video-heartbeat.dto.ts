import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsUUID, Max, Min } from 'class-validator';

export class VideoHeartbeatDto {
  @IsUUID('4')
  activitySessionId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  sequence!: number;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(86_400_000)
  currentTimeMs!: number;

  @IsBoolean()
  playing!: boolean;

  @IsBoolean()
  ended!: boolean;

  @IsEnum(['visible', 'hidden'] as const)
  visibility!: 'visible' | 'hidden';

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.5)
  @Max(4)
  playbackRate!: number;
}
