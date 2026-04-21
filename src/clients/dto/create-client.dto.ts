import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  companyName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  contactPerson!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}
