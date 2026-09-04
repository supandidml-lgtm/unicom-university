import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RevokeCertificateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
