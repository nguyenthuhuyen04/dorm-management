import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User, UserStatus } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<User> {
    return this.usersService.create(registerDto);
  }

  private async verifyPassword(
    plainPassword: string,
    storedPassword: string,
  ): Promise<{ matches: boolean; isLegacy: boolean }> {
    const normalizedStored = String(storedPassword ?? '').trim();
    if (!normalizedStored) {
      return { matches: false, isLegacy: false };
    }

    if (normalizedStored.startsWith('$2')) {
      const bcryptMatches = await compare(plainPassword, normalizedStored);
      return {
        matches: bcryptMatches,
        isLegacy: false,
      };
    }

    const legacyMatches = normalizedStored === plainPassword;
    return {
      matches: legacyMatches,
      isLegacy: legacyMatches,
    };
  }

  async validateUser(identifier: string, password: string): Promise<User> {
    const user = await this.usersService.findByUsernameOrEmail(identifier);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('User account is inactive');
    }

    const passwordCheck = await this.verifyPassword(password, user.password);
    if (!passwordCheck.matches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (passwordCheck.isLegacy) {
      await this.usersService.update(user.id, { password });
    }

    return user;
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    const identifier =
      loginDto.identifier ?? loginDto.email ?? loginDto.username ?? '';
    const user = await this.validateUser(identifier, loginDto.password);
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
    const token = await this.jwtService.signAsync(payload);

    return {
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }
}
