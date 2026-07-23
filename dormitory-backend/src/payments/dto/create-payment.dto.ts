import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentStatus } from '../../common/enums/user-role.enum';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  invoice_code!: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  student_id!: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  contract_id!: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  utility_bill_id!: number;

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
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  room_fee!: number;

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
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  other_fee?: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  total_amount!: number;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  due_date!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  payment_date?: Date;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}
