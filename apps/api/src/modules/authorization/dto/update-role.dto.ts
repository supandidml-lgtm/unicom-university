import { IsBoolean, IsEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEmpty({ message: 'code is immutable after role creation.' })
  code?: never;

  @IsOptional()
  @IsEmpty({ message: 'isSystem is managed internally.' })
  isSystem?: never;
}
