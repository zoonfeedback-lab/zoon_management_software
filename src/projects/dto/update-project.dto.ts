import { ProjectStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'Website Redesign', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated project scope.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: ProjectStatus, example: 'IN_PROGRESS' })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ example: '7f7f7078-4ac5-4ebe-9ae2-c131f9114fb8' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['7f7f7078-4ac5-4ebe-9ae2-c131f9114fb8'],
  })
  @IsOptional()
  @Type(() => String)
  @IsArray()
  @IsUUID('4', { each: true })
  memberIds?: string[];
}
