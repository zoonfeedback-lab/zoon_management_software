import { TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Implement authentication', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated task description.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, example: 'IN_PROGRESS' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ example: 'HIGH', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  priority?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: '7f7f7078-4ac5-4ebe-9ae2-c131f9114fb8' })
  @IsOptional()
  @Type(() => String)
  @IsUUID()
  assignedToId?: string;
}
