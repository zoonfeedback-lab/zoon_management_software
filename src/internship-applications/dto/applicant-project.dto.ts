import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApplicantProjectDto {
  @ApiProperty({ example: 'E-Commerce Platform', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Full Stack Developer', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  role!: string;

  @ApiProperty({ example: 'React, Node.js, PostgreSQL', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  technologies!: string;

  @ApiPropertyOptional({
    example: 'https://github.com/user/project',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;
}
