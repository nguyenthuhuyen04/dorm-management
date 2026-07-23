import { IsNotEmpty, MinLength } from 'class-validator';

export class LoginUserDto {
  @IsNotEmpty()
  username!: string;

  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
