import { IsNotEmpty, IsString, IsEmail, IsEnum, IsArray, IsOptional } from "class-validator";
import { SystemRole, JobProfile, AccountStatus } from "@unicom/types";

export class CreateUserDto {
  @IsNotEmpty({ message: "NIK wajib diisi" })
  @IsString()
  nik!: string;

  @IsNotEmpty({ message: "Nama lengkap wajib diisi" })
  @IsString()
  name!: string;

  @IsNotEmpty({ message: "Email wajib diisi" })
  @IsEmail({}, { message: "Format email tidak valid" })
  email!: string;

  @IsNotEmpty({ message: "Password wajib diisi" })
  @IsString()
  password!: string;

  @IsNotEmpty({ message: "Role sistem wajib dipilih" })
  @IsEnum(SystemRole)
  role!: SystemRole;

  @IsNotEmpty({ message: "Job profile wajib dipilih" })
  @IsEnum(JobProfile)
  jobProfile!: JobProfile;

  @IsNotEmpty({ message: "Cabang wajib dipilih" })
  @IsString()
  branchId!: string;

  @IsArray()
  @IsOptional()
  brandIds?: string[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(SystemRole)
  role?: SystemRole;

  @IsOptional()
  @IsEnum(JobProfile)
  jobProfile?: JobProfile;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsArray()
  brandIds?: string[];

  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;
}
