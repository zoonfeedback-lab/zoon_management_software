import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateSupportRequestDto {
  @ApiProperty({
    example: 'Need minor text update in the delivered PDF within support window.',
  })
  @IsString()
  @MaxLength(1500)
  description!: string;
}
