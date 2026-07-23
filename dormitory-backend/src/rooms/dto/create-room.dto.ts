import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Gender, RoomStatus } from '../../common/enums/user-role.enum';

export class CreateRoomDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  building_id!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  room_number!: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  floor!: number;

  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'room_type must not be empty' })
  @MaxLength(20)
  room_type?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity!: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  room_fee!: number;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}
