import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class MaterialOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  materialIds!: string[];
}
