import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsNotEmpty({ message: "NIK atau Email wajib diisi" })
  @IsString()
  identifier!: string;

  @IsNotEmpty({ message: "Password wajib diisi" })
  @IsString()
  @MinLength(6, { message: "Password minimal 6 karakter" })
  password!: string;
}

export class RefreshTokenDto {
  @IsNotEmpty({ message: "Refresh token wajib disertakan" })
  @IsString()
  refreshToken!: string;
}
