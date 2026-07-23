import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ContractStatus } from '../../common/enums/user-role.enum';

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contract_code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  student_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  room_id?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start_date?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end_date?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  deposit?: number;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
}
