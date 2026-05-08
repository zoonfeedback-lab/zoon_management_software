import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VerifySetupTokenDto {
  @ApiProperty({ example: 'raw_setup_token_from_email' })
  @IsString()
  @MinLength(32)
  token!: string;
}
