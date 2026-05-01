import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmployeeLoginDto {
  @ApiProperty({
    example: 'employee@example.com',
    description: 'Employee email address provided by admin',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Admin@123',
    minLength: 8,
    description: 'Password provided by admin via email',
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
