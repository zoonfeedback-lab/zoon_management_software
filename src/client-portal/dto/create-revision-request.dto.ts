import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateRevisionRequestDto {
  @ApiProperty({
    example: 'Please revise the final section based on our updated brand guide.',
  })
  @IsString()
  @MaxLength(1500)
  description!: string;
}
