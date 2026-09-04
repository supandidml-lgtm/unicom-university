import { IsUUID } from 'class-validator';

export class AcknowledgeMaterialDto {
  @IsUUID('4')
  activitySessionId!: string;
}
