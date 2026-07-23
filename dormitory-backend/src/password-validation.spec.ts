import 'reflect-metadata';
import { validate } from 'class-validator';
import { RegisterDto } from './auth/dto/register.dto';
import { CreateUserDto } from './users/dto/create-user.dto';
import { UpdateUserDto } from './users/dto/update-user.dto';

describe('password validation DTOs', () => {
  it.each([
    ['RegisterDto', RegisterDto, { username: 'user1', full_name: 'User One', email: 'user1@example.com', password: 'weakpass' }],
    ['CreateUserDto', CreateUserDto, { username: 'user2', email: 'user2@example.com', password: 'weakpass' }],
    ['UpdateUserDto', UpdateUserDto, { password: 'weakpass' }],
  ])('rejects weak passwords for %s', async (_name, dtoClass, plainDto) => {
    const dto = Object.assign(new dtoClass(), plainDto);
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });

  it.each([
    ['RegisterDto', RegisterDto, { username: 'user1', full_name: 'User One', email: 'user1@example.com', password: 'StrongPass1!' }],
    ['CreateUserDto', CreateUserDto, { username: 'user2', email: 'user2@example.com', password: 'StrongPass1!' }],
    ['UpdateUserDto', UpdateUserDto, { password: 'StrongPass1!' }],
  ])('accepts strong passwords for %s', async (_name, dtoClass, plainDto) => {
    const dto = Object.assign(new dtoClass(), plainDto);
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
