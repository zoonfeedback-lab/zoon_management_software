import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsDateString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Implement authentication', minLength: 3, maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  title!: string;

  @ApiPropertyOptional({ example: 'Implement login and JWT guard.', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 'HIGH', enum: ['LOW', 'MEDIUM', 'HIGH'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  priority!: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ example: '7f7f7078-4ac5-4ebe-9ae2-c131f9114fb8' })
  @Type(() => String)
  @IsUUID()
  projectId!: string;

  @ApiPropertyOptional({ example: '7f7f7078-4ac5-4ebe-9ae2-c131f9114fb8' })
  @IsOptional()
  @Type(() => String)
  @IsUUID()
  assignedToId?: string;
}
