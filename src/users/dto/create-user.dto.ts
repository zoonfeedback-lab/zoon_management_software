import { AvailabilityStatus, RoleKey } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'new.user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 64, example: 'strongPass123' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;

  @ApiProperty({ example: 'John Doe', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ enum: RoleKey, example: 'ADMIN' })
  @IsEnum(RoleKey)
  role!: RoleKey;

  @ApiPropertyOptional({ example: '+1-555-0000', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ example: 'Software Engineer', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @ApiPropertyOptional({ example: 'Engineering', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @ApiPropertyOptional({ example: 'Senior', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  experienceLevel?: string;

  @ApiPropertyOptional({ type: [String], example: ['nestjs', 'prisma'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({
    enum: AvailabilityStatus,
    example: 'AVAILABLE',
  })
  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availabilityStatus?: AvailabilityStatus;
}
