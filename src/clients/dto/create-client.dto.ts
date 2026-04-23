import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ example: 'Acme Corp', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  companyName!: string;

  @ApiProperty({ example: 'Jane Smith', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  contactPerson!: string;

  @ApiProperty({ example: 'contact@acme.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+1-555-0100', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({
    example: '7f7f7078-4ac5-4ebe-9ae2-c131f9114fb8',
    description: 'Optional linked auth user id (should be CLIENT role).',
  })
  @IsOptional()
  @IsUUID()
  authUserId?: string;
}
