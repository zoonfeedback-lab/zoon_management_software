import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum SkillProficiencyDto {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export class ApplicantSkillDto {
  @ApiProperty({ example: 'JavaScript', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  skillName!: string;

  @ApiPropertyOptional({
    enum: SkillProficiencyDto,
    example: 'INTERMEDIATE',
    default: 'BEGINNER',
  })
  @IsOptional()
  @IsEnum(SkillProficiencyDto)
  proficiency?: SkillProficiencyDto;
}
