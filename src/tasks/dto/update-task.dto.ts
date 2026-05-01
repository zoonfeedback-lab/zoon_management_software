import { TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsDateString,
  IsEnum,
  MinLength,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { CreateTaskAttachmentDto } from './create-task-attachment.dto';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    example: 'Implement authentication',
    minLength: 3,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated task description.', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, example: 'IN_PROGRESS' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ example: 'HIGH', enum: ['LOW', 'MEDIUM', 'HIGH'] })
  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  priority?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: '7f7f7078-4ac5-4ebe-9ae2-c131f9114fb8' })
  @IsOptional()
  @Type(() => String)
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({
    description: 'New file attachments to append to the task',
    type: [CreateTaskAttachmentDto],
    example: [
      {
        fileName: 'updated-spec.pdf',
        fileUrl: 'https://res.cloudinary.com/dbqdibhht/raw/upload/v1/updated-spec.pdf',
        fileType: 'application/pdf',
        fileSize: 102400,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskAttachmentDto)
  attachments?: CreateTaskAttachmentDto[];
}
