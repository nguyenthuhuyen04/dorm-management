import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateRoomChangeRequestDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  studentId!: number;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  requestedRoomId!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason!: string;
}
