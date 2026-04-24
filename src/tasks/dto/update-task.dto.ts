import { TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsDateString,
  IsEnum,
  MinLength,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    example: 'Implement authentication',
    minLength: 3,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated task description.', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, example: 'IN_PROGRESS' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ example: 'HIGH', enum: ['LOW', 'MEDIUM', 'HIGH'] })
  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
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
