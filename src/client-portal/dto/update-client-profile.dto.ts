import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateClientProfileDto {
  @ApiPropertyOptional({ example: 'Jane Smith', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactPerson?: string;

  @ApiPropertyOptional({ example: 'Acme Corp', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  companyName?: string;

  @ApiPropertyOptional({ example: 'client@acme.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1-555-0100', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}
