import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Implement authentication', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @ApiPropertyOptional({ example: 'Implement login and JWT guard.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 'HIGH', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
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
