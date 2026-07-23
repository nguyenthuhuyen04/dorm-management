import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ContractStatus } from '../../common/enums/user-role.enum';

export class CreateContractDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  contract_code!: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  student_id!: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  room_id!: number;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  start_date!: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  end_date!: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  deposit?: number;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
}
