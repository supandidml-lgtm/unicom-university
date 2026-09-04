import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phoneNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  nik!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;
}
