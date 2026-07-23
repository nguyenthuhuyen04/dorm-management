import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { UtilityBillStatus } from '../../common/enums/user-role.enum';

export class CreateUtilityBillDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  room_id!: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year!: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  electric_old!: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  electric_new!: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  water_old!: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  water_new!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  electric_fee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  water_fee?: number;

  @IsOptional()
  @IsEnum(UtilityBillStatus)
  status?: UtilityBillStatus;
}
