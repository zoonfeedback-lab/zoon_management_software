import { ApiProperty } from '@nestjs/swagger';
import { RevisionStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateRevisionStatusDto {
  @ApiProperty({ enum: RevisionStatus, example: RevisionStatus.APPROVED })
  @IsEnum(RevisionStatus)
  status!: RevisionStatus;
}
