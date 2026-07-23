import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../users/user.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let context: Partial<ExecutionContext>;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
    context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { role: UserRole.ADMIN },
        }),
      }),
    };
  });

  it('allows public routes without role checks', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);
    expect(guard.canActivate(context as ExecutionContext)).toBe(true);
  });

  it('allows access when no roles are required', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(undefined);
    expect(guard.canActivate(context as ExecutionContext)).toBe(true);
  });

  it('allows access when user has required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce([UserRole.ADMIN]);
    expect(guard.canActivate(context as ExecutionContext)).toBe(true);
  });

  it('throws ForbiddenException when user is missing role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce([UserRole.ADMIN]);
    context.switchToHttp = jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({}),
    });

    expect(() => guard.canActivate(context as ExecutionContext)).toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when user does not have required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce([UserRole.MANAGER]);
    expect(() => guard.canActivate(context as ExecutionContext)).toThrow(
      ForbiddenException,
    );
  });
});
