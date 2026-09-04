import { IsUUID } from 'class-validator';

export class AssignBrandAccessDto {
  @IsUUID('4')
  brandId!: string;
}
