import { ApprovalStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateApprovalDto {
  @ApiPropertyOptional({
    enum: ApprovalStatus,
    example: ApprovalStatus.APPROVED,
  })
  @IsOptional()
  @IsEnum(ApprovalStatus)
  status?: ApprovalStatus;

  @ApiPropertyOptional({ example: 'Approved after final review.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
