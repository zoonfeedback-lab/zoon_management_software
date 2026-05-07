import { AvailabilityStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  Matches,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateInternDto {
  @ApiPropertyOptional({ example: 'Ali Khan', minLength: 2, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Za-z ]+$/, {
    message: 'Full name can contain only letters and spaces',
  })
  fullName?: string;

  @ApiPropertyOptional({ example: '+923001234567', maxLength: 13 })
  @IsOptional()
  @IsString()
  @MaxLength(13)
  @Matches(/^(\+92[0-9]{10}|03[0-9]{9})$/, {
    message: 'Phone must be a valid Pakistan number',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 'COMSATS University Islamabad', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  universityName?: string;

  @ApiPropertyOptional({ example: 'BS Computer Science', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  degreeProgram?: string;

  @ApiPropertyOptional({ example: '6th Semester', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  currentSemester?: string;

  @ApiPropertyOptional({ type: [String], example: ['react', 'typescript'] })
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
