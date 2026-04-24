import { IsString, IsNotEmpty, IsUUID, MinLength } from 'class-validator';

export class AddTeamMemberDto {
  @IsUUID()
  @IsNotEmpty()
  memberId: string;
}

export class RejectRevisionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Feedback must be at least 10 characters long' })
  feedback: string;
}
