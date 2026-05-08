import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateClientInviteDto {
  @ApiProperty({ example: 'John Doe', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'john@gmail.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    example: 'Acme Corp',
    maxLength: 150,
    description:
      'Optional company name. If omitted, backend generates a placeholder.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  companyName?: string;

  @ApiPropertyOptional({ example: '+1-555-0100', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}
