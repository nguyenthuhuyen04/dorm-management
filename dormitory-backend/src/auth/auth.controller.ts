import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './public.decorator';
import { User } from '../users/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<{ message: string; user: User }> {
    const user = await this.authService.register(registerDto);
    return {
      message: 'Register successfully',
      user,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Public()
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string; accessToken: string; user: Partial<User> }> {
    const result = await this.authService.login(loginDto);
    res.cookie('Authentication', result.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
    });
    return {
      message: 'Login successfully',
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('logout')
  async logout(
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    res.clearCookie('Authentication');
    return { message: 'Logout successfully' };
  }
}
