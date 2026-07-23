import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Gender } from '../../common/enums/user-role.enum';

export class CreateStudentDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  user_id!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  student_code!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  phone?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthday?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  faculty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  class_name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  parent_phone?: string;
}
