import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  token!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(256)
  password!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(256)
  confirmPassword!: string;
}
