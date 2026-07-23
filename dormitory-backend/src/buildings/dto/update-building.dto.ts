import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BuildingGender } from '../../common/enums/building-gender.enum';

export class UpdateBuildingDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  building_name?: string;

  @IsOptional()
  @IsEnum(BuildingGender, {
    message: 'gender must be either Male or Female',
  })
  gender?: BuildingGender;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'manager_id must be greater than 0' })
  manager_id?: number;

  @IsOptional()
  @IsString()
  description?: string | null;
}
