import { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole, UserStatus } from '../users/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { login: jest.Mock };
  let response: Partial<Response>;

  beforeEach(() => {
    authService = {
      login: jest.fn(),
    } as any;
    controller = new AuthController(authService as any);
    response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  it('logs in and sets the Authentication cookie', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'jwt-token',
      user: {
        id: 2,
        username: 'loginuser',
        email: 'loginuser@test.com',
        role: UserRole.MANAGER,
      },
    });

    const result = await controller.login(
      { username: 'loginuser', password: 'Password1!' } as any,
      response as Response,
    );

    expect(result).toEqual({
      message: 'Login successfully',
      accessToken: 'jwt-token',
      user: {
        id: 2,
        username: 'loginuser',
        email: 'loginuser@test.com',
        role: UserRole.MANAGER,
      },
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'Authentication',
      'jwt-token',
      {
        httpOnly: true,
        sameSite: 'lax',
      },
    );
  });

  it('logs out and clears the Authentication cookie', async () => {
    const result = await controller.logout(response as Response);

    expect(result).toEqual({ message: 'Logout successfully' });
    expect(response.clearCookie).toHaveBeenCalledWith('Authentication');
  });
});
