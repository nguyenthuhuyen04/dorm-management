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

function normalizeGender(value: string): string {
  if (!value) return value;
  const upper = value.toUpperCase();
  if (upper === 'MALE') return 'Male';
  if (upper === 'FEMALE') return 'Female';
  return value;
}

export class UpdateBuildingDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  building_name?: string;

  @IsOptional()
  @Transform(({ value }: { value: string }) => normalizeGender(value))
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
