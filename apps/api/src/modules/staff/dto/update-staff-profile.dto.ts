import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStaffProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneNumber?: string;
}
