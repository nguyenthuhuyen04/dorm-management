import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TargetRole } from '../../common/enums/user-role.enum';

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(TargetRole)
  target_role?: TargetRole;
}
