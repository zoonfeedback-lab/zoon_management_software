import { AvailabilityStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

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

  @ApiPropertyOptional({ enum: AvailabilityStatus, example: 'AVAILABLE' })
  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availabilityStatus?: AvailabilityStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
