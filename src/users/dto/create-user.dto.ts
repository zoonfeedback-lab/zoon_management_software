import { AvailabilityStatus, RoleKey } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  Matches,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'new.user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 64, example: 'Admin@123' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message:
      'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password!: string;

  @ApiProperty({ example: 'John Doe', minLength: 2, maxLength: 50 })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Za-z ]+$/, {
    message: 'Full name can contain only letters and spaces',
  })
  fullName!: string;

  @ApiProperty({ enum: RoleKey, example: 'ADMIN' })
  @IsEnum(RoleKey)
  role!: RoleKey;

  @ApiPropertyOptional({ example: '+923001234567', maxLength: 13 })
  @IsOptional()
  @IsString()
  @MaxLength(13)
  @Matches(/^(\+92[0-9]{10}|03[0-9]{9})$/, {
    message: 'Phone must be a valid Pakistan number',
  })
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
