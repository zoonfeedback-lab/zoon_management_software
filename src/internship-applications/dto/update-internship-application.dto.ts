import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApplicantSkillDto } from './applicant-skill.dto';
import { ApplicantProjectDto } from './applicant-project.dto';

export class UpdateInternshipApplicationDto {
  @ApiPropertyOptional({ example: 'Ali Ahmed', minLength: 2, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: 'ali.ahmed@university.edu.pk' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+923001234567', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'FAST NUCES', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  universityName?: string;

  @ApiPropertyOptional({ example: 'BS Computer Science', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  degreeProgram?: string;

  @ApiPropertyOptional({ example: '6th Semester', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  currentSemester?: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: 2,
    example: ['Web Development (Frontend)', 'Full Stack Development'],
    description:
      'Select up to 2 areas: DSA, OOP, Database Management, Web Development (Frontend), Web Development (Backend), Full Stack Development, Mobile App Development, Machine Learning / AI, Data Analysis, Cybersecurity, Cloud Computing, Other',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @IsString({ each: true })
  confidentAreas?: string[];

  @ApiPropertyOptional({
    type: [ApplicantSkillDto],
    description:
      'Key skills with proficiency ratings. When provided, replaces all existing skills.',
    example: [
      { skillName: 'JavaScript', proficiency: 'ADVANCED' },
      { skillName: 'SQL', proficiency: 'INTERMEDIATE' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicantSkillDto)
  skills?: ApplicantSkillDto[];

  @ApiPropertyOptional({
    type: [String],
    example: ['VS Code / Visual Studio', 'Git / GitHub', 'Figma / Adobe XD'],
    description:
      'Tools used: Microsoft Excel, Power BI / Tableau, Figma / Adobe XD, Canva, VS Code / Visual Studio, Git / GitHub, CRM Tools, Others',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toolsUsed?: string[];

  @ApiPropertyOptional({ example: 'VS Code', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  mostConfidentTool?: string;

  @ApiPropertyOptional({
    example:
      'I have been using VS Code for over 3 years for all my development work including extensions and debugging.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mostConfidentToolReason?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  hasProjects?: boolean;

  @ApiPropertyOptional({
    type: [ApplicantProjectDto],
    description:
      'Projects worked on. When provided, replaces all existing projects.',
    example: [
      {
        title: 'E-Commerce Platform',
        role: 'Full Stack Developer',
        technologies: 'React, Node.js, PostgreSQL',
        link: 'https://github.com/user/project',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicantProjectDto)
  projects?: ApplicantProjectDto[];

  @ApiPropertyOptional({
    example:
      'During my database project, I faced a complex query optimization issue. I solved it by analyzing the execution plan and adding proper indexes.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  problemSolvingAnswer?: string;
}
