import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class AssignTaskDto {
  @IsUUID()
  @IsNotEmpty()
  memberId: string;
}
