jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcrypt';
import { AuthService } from './auth.service';
import { UserStatus, UserRole } from '../users/user.entity';

const compareMock = compare as jest.MockedFunction<typeof compare>;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByUsernameOrEmail: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(() => {
    compareMock.mockReset();
    usersService = {
      findByUsernameOrEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
    };
    service = new AuthService(usersService as any, jwtService as any);
  });

  it('throws UnauthorizedException when user is not found', async () => {
    usersService.findByUsernameOrEmail.mockResolvedValue(null);

    await expect(service.validateUser('missing', 'Password1!')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when password does not match', async () => {
    usersService.findByUsernameOrEmail.mockResolvedValue({
      id: 1,
      username: 'student',
      email: 'student@test.com',
      password: '$2b$10$mockedhash',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    });
    compareMock.mockResolvedValue(false);

    await expect(
      service.validateUser('student', 'wrong-password'),
    ).rejects.toThrow(UnauthorizedException);
    expect(compareMock).toHaveBeenCalledWith(
      'wrong-password',
      '$2b$10$mockedhash',
    );
  });

  it('migrates a legacy plain text password to bcrypt during login', async () => {
    usersService.findByUsernameOrEmail.mockResolvedValue({
      id: 1,
      username: 'admin',
      email: 'admin@test.com',
      password: 'legacy-password',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });
    usersService.update.mockResolvedValue({});
    jwtService.signAsync.mockResolvedValue('signed-token');

    await expect(
      service.login({ email: 'admin', password: 'legacy-password' } as any),
    ).resolves.toMatchObject({
      accessToken: 'signed-token',
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
      },
    });

    expect(usersService.update).toHaveBeenCalledWith(1, {
      password: 'legacy-password',
    });
  });

  it('rejects login for inactive users', async () => {
    usersService.findByUsernameOrEmail.mockResolvedValue({
      id: 2,
      username: 'inactive',
      email: 'inactive@test.com',
      password: 'StrongPass1!',
      role: UserRole.STUDENT,
      status: UserStatus.INACTIVE,
    });

    await expect(
      service.login({ email: 'inactive', password: 'StrongPass1!' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns a valid JWT payload during login', async () => {
    const user = {
      id: 3,
      username: 'john',
      email: 'john@test.com',
      password: '$2b$10$mockedhash',
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
    };
    usersService.findByUsernameOrEmail.mockResolvedValue(user);
    compareMock.mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('jwt-token');

    await expect(
      service.login({ identifier: 'john', password: 'StrongPass1!' } as any),
    ).resolves.toEqual({
      accessToken: 'jwt-token',
      user: {
        id: 3,
        username: 'john',
        email: 'john@test.com',
        role: UserRole.MANAGER,
      },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 3,
      username: 'john',
      email: 'john@test.com',
      role: UserRole.MANAGER,
    });
  });
});
