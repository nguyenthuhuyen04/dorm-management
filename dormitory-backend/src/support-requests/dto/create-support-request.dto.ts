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
import { SupportStatus } from '../../common/enums/user-role.enum';

export class CreateSupportRequestDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  studentId!: number;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  roomId!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  category!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsOptional()
  @IsEnum(SupportStatus)
  status?: SupportStatus;
}