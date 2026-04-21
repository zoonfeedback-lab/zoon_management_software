import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  priority!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @Type(() => String)
  @IsUUID()
  projectId!: string;

  @IsOptional()
  @Type(() => String)
  @IsUUID()
  assignedToId?: string;
}
