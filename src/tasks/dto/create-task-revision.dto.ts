import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateTaskRevisionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Feedback must be at least 10 characters long' })
  feedback: string;
}
