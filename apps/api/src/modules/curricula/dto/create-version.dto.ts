import { IsOptional, IsUUID } from 'class-validator';

export class CreateVersionDto {
  @IsOptional()
  @IsUUID('4')
  cloneFromVersionId?: string;
}
