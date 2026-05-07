import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateInternshipApplicationDto {
  @ApiProperty({ example: 'Ali Ahmed', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @ApiProperty({ example: 'ali.ahmed@university.edu.pk' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+923001234567', maxLength: 20 })
  @IsString()
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: 'FAST NUCES', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  universityName!: string;

  @ApiProperty({ example: 'BS Computer Science', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  degreeProgram!: string;

  @ApiProperty({ example: '6th Semester', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  currentSemester!: string;

  @ApiProperty({
    type: [String],
    maxItems: 2,
    example: ['Web Development (Frontend)', 'Full Stack Development'],
    description:
      'Select up to 2 areas: DSA, OOP, Database Management, Web Development (Frontend), Web Development (Backend), Full Stack Development, Mobile App Development, Machine Learning / AI, Data Analysis, Cybersecurity, Cloud Computing, Other',
  })
  @IsArray()
  @ArrayMaxSize(2)
  @IsString({ each: true })
  confidentAreas!: string[];

  @ApiProperty({
    type: [ApplicantSkillDto],
    description: 'Key skills with proficiency ratings',
    example: [
      { skillName: 'JavaScript', proficiency: 'ADVANCED' },
      { skillName: 'SQL', proficiency: 'INTERMEDIATE' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicantSkillDto)
  skills!: ApplicantSkillDto[];

  @ApiProperty({
    type: [String],
    example: ['VS Code / Visual Studio', 'Git / GitHub', 'Figma / Adobe XD'],
    description:
      'Tools used: Microsoft Excel, Power BI / Tableau, Figma / Adobe XD, Canva, VS Code / Visual Studio, Git / GitHub, CRM Tools, Others',
  })
  @IsArray()
  @IsString({ each: true })
  toolsUsed!: string[];

  @ApiProperty({ example: 'VS Code', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  mostConfidentTool!: string;

  @ApiProperty({
    example:
      'I have been using VS Code for over 3 years for all my development work including extensions and debugging.',
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000)
  mostConfidentToolReason!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  hasProjects!: boolean;

  @ApiPropertyOptional({
    type: [ApplicantProjectDto],
    description: 'Projects worked on (required if hasProjects is true)',
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

  @ApiProperty({
    example:
      'During my database project, I faced a complex query optimization issue. I solved it by analyzing the execution plan and adding proper indexes.',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  problemSolvingAnswer!: string;
}
