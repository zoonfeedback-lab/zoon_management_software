import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDeliverableDto {
  @ApiProperty({ example: 'final-design-v2.pdf', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'https://cdn.example.com/files/final-design-v2.pdf' })
  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @ApiPropertyOptional({ example: 'application/pdf', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fileType?: string;

  @ApiPropertyOptional({ example: 204800, description: 'File size in bytes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @ApiPropertyOptional({
    example: 'Final approved version of the homepage design.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: '7f7f7078-4ac5-4ebe-9ae2-c131f9114fb8' })
  @IsUUID()
  projectId!: string;
}
