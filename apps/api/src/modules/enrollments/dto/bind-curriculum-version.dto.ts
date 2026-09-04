import { IsUUID } from 'class-validator';

export class BindCurriculumVersionDto {
  @IsUUID('4')
  curriculumVersionId!: string;
}
