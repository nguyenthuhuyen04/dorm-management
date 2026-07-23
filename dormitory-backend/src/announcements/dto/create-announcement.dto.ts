import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TargetRole } from '../../common/enums/user-role.enum';

export class CreateAnnouncementDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsNotEmpty()
  @IsString()
  content!: string;

  @IsNotEmpty()
  @IsEnum(TargetRole)
  target_role!: TargetRole;
}
