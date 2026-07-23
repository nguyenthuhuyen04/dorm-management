import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Gender, RoomStatus } from '../../common/enums/user-role.enum';

export class UpdateRoomDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  building_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  room_number?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  floor?: number;

  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'room_type must not be empty' })
  @MaxLength(20)
  room_type?: string | null;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  room_fee?: number;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}
