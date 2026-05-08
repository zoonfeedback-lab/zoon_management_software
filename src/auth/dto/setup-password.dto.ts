import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SetupPasswordDto {
  @ApiProperty({ example: 'raw_setup_token_from_email' })
  @IsString()
  @MinLength(32)
  token!: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    minLength: 8,
    maxLength: 64,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message:
      'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password!: string;
}
