import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTaskAttachmentDto {
  @ApiProperty({ example: 'design-mockup.png', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/dbqdibhht/image/upload/v1/design-mockup.png' })
  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @ApiPropertyOptional({ example: 'image/png', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fileType?: string;

  @ApiPropertyOptional({ example: 204800, description: 'File size in bytes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;
}
