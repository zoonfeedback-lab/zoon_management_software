import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFeedbackDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'Communication was clear and timely.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  communication?: string;

  @ApiPropertyOptional({ example: 'The final quality met our expectations.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  quality?: string;

  @ApiPropertyOptional({ example: 'Great value for the timeline and output.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  value?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  wouldRecommend!: boolean;
}
