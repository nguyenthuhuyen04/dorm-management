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

export class UpdateSupportRequestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Reply should not be empty if provided' })
  reply?: string;

  @IsOptional()
  @IsEnum(SupportStatus)
  status?: SupportStatus;
}