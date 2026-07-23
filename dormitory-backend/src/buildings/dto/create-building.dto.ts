import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { BuildingGender } from '../../common/enums/building-gender.enum';

export class CreateBuildingDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  building_name!: string;

  @IsNotEmpty()
  @IsEnum(BuildingGender, {
    message: 'gender must be either Male or Female',
  })
  gender!: BuildingGender;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'manager_id must be greater than 0' })
  manager_id!: number;

  @IsOptional()
  @IsString()
  description?: string;
}
