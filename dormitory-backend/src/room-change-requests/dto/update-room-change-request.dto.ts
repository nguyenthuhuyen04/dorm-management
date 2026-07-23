import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { RoomChangeStatus } from '../../common/enums/user-role.enum';

export class UpdateRoomChangeRequestDto {
  @IsOptional()
  @IsEnum(RoomChangeStatus)
  status?: RoomChangeStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  approvedBy?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
