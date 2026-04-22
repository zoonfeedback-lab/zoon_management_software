import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Website Redesign', maxLength: 150 })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: 'Full redesign for company website.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: '7f7f7078-4ac5-4ebe-9ae2-c131f9114fb8' })
  @IsUUID()
  clientId!: string;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

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
