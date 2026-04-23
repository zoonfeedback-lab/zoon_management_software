import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendNotificationDto {
  @ApiProperty({ example: 'Project Update', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    example: 'Your project "Website Redesign" has been moved to Active status.',
    maxLength: 1500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1500)
  message!: string;
}
