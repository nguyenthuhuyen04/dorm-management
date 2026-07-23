import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let context: Partial<ExecutionContext>;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
    context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    };
  });

  it('returns true when the route is public', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    expect(guard.canActivate(context as ExecutionContext)).toBe(true);
  });

  it('throws UnauthorizedException when no user is attached', () => {
    expect(() =>
      guard.handleRequest(null, null, null, context as ExecutionContext),
    ).toThrow(UnauthorizedException);
  });

  it('returns the user when authentication succeeds', () => {
    const user = { id: 1 };
    expect(
      guard.handleRequest(null, user, null, context as ExecutionContext),
    ).toBe(user);
  });
});
