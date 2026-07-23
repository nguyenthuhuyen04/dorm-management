import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { jwtConstants } from './auth.constants';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: { findOne: jest.Mock };

  beforeEach(() => {
    usersService = {
      findOne: jest.fn(),
    };
    strategy = new JwtStrategy(usersService as any);
  });

  it('validates a payload and returns user information', async () => {
    usersService.findOne.mockResolvedValue({
      id: 1,
      username: 'testuser',
      email: 'testuser@test.com',
      role: 'ADMIN',
    });

    await expect(
      strategy.validate({
        sub: 1,
        username: 'testuser',
        email: 'testuser@test.com',
        role: 'ADMIN',
      }),
    ).resolves.toEqual({
      userId: 1,
      username: 'testuser',
      email: 'testuser@test.com',
      role: 'ADMIN',
    });
    expect(usersService.findOne).toHaveBeenCalledWith(1);
  });

  it('throws UnauthorizedException when user is not found', async () => {
    usersService.findOne.mockRejectedValue(new NotFoundException());

    await expect(
      strategy.validate({
        sub: 99,
        username: 'missing',
        email: null,
        role: 'STUDENT',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
