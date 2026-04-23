import { ApiProperty } from '@nestjs/swagger';
import { SupportRequestStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateSupportRequestStatusDto {
  @ApiProperty({
    enum: SupportRequestStatus,
    example: SupportRequestStatus.IN_PROGRESS,
  })
  @IsEnum(SupportRequestStatus)
  status!: SupportRequestStatus;
}
