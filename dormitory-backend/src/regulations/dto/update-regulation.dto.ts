import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRegulationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
