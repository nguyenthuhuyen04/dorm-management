import {
  BadRequestException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole, UserStatus } from './user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUser = {
    id: 1,
    username: 'user1',
    fullName: 'User One',
    email: 'user1@example.com',
    phone: '123456789',
    password: 'hashed',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    student: null,
    managedBuildings: [],
  };

  const mockAdmin = {
    id: 2,
    username: 'admin',
    fullName: 'Admin User',
    email: 'admin@example.com',
    phone: null,
    password: 'hashed',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    student: null,
    managedBuildings: [],
  };

  const mockManager = {
    id: 3,
    username: 'manager1',
    fullName: 'Manager One',
    email: 'manager1@example.com',
    phone: null,
    password: 'hashed',
    role: UserRole.MANAGER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    student: null,
    managedBuildings: [],
  };

  beforeEach(() => {
    usersService = {
      findOne: jest.fn(),
      findAll: jest.fn(),
      findAllWithFilters: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findByEmail: jest.fn(),
      findByUsernameOrEmail: jest.fn(),
    } as any;

    controller = new UsersController(usersService);
  });

  describe('GET /users', () => {
    it('should return all users when no filters provided', async () => {
      usersService.findAll.mockResolvedValue([mockUser, mockManager]);

      const result = await controller.findAll({
        user: { userId: 2, role: UserRole.ADMIN },
      } as any);

      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should return paginated results with filters', async () => {
      const paginatedResult = {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        data: [mockUser],
      };
      usersService.findAllWithFilters.mockResolvedValue(paginatedResult as any);

      const result = await controller.findAll(
        { user: { userId: 2, role: UserRole.ADMIN } } as any,
        '1',
        '10',
        'user1',
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(usersService.findAllWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
          username: 'user1',
        }),
        expect.any(Object),
      );
      expect(result).toEqual(paginatedResult);
    });

    it('should pass query parameters to service', async () => {
      const paginatedResult = {
        total: 1,
        page: 2,
        limit: 20,
        totalPages: 1,
        data: [mockManager],
      };
      usersService.findAllWithFilters.mockResolvedValue(paginatedResult as any);

      await controller.findAll(
        { user: { userId: 2, role: UserRole.ADMIN } } as any,
        '2',
        '20',
        undefined,
        'user1@example.com',
        'User One',
        UserRole.MANAGER,
        UserStatus.ACTIVE,
        'username',
        'DESC',
      );

      expect(usersService.findAllWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 20,
          email: 'user1@example.com',
          full_name: 'User One',
          role: UserRole.MANAGER,
          status: UserStatus.ACTIVE,
          sortBy: 'username',
          sortOrder: 'DESC',
        }),
        expect.any(Object),
      );
    });

    it('should trim whitespace from query parameters', async () => {
      const paginatedResult = {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        data: [mockUser],
      };
      usersService.findAllWithFilters.mockResolvedValue(paginatedResult as any);

      await controller.findAll(
        { user: { userId: 2, role: UserRole.ADMIN } } as any,
        '1',
        '10',
        '  user1  ',
      );

      expect(usersService.findAllWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'user1',
        }),
        expect.any(Object),
      );
    });
  });

  describe('GET /users/me', () => {
    it('should return current user profile', async () => {
      usersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.getMe({
        user: { userId: 1 },
      } as any);

      expect(usersService.findOne).toHaveBeenCalledWith(1, { userId: 1 });
      expect(result).toEqual(mockUser);
    });

    it('should throw BadRequestException when userId is missing', async () => {
      await expect(controller.getMe({ user: {} } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when user is missing', async () => {
      await expect(
        controller.getMe({ user: undefined } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by id', async () => {
      usersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('1', {
        user: { userId: 2, role: UserRole.ADMIN },
      } as any);

      expect(usersService.findOne).toHaveBeenCalledWith(1, expect.any(Object));
      expect(result).toEqual(mockUser);
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(
        controller.findOne('abc', {
          user: { userId: 2, role: UserRole.ADMIN },
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow student to view own profile', async () => {
      usersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('1', {
        user: { userId: 1, role: UserRole.STUDENT },
      } as any);

      expect(result).toEqual(mockUser);
    });

    it('should forbid student from viewing other profiles', async () => {
      usersService.findOne.mockImplementation(() => {
        throw new ForbiddenException('You can only access your own profile.');
      });

      await expect(
        controller.findOne('2', {
          user: { userId: 1, role: UserRole.STUDENT },
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forbid manager from viewing admin profiles', async () => {
      usersService.findOne.mockImplementation(() => {
        throw new ForbiddenException(
          'You do not have permission to access this resource.',
        );
      });

      await expect(
        controller.findOne('2', {
          user: { userId: 3, role: UserRole.MANAGER },
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('POST /users', () => {
    it('should create user successfully', async () => {
      usersService.create.mockResolvedValue(mockUser);

      const result = await controller.create({
        username: 'user1',
        email: 'user1@example.com',
        password: 'StrongPass1!',
        full_name: 'User One',
      } as any);

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'user1',
          email: 'user1@example.com',
        }),
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException for duplicate email', async () => {
      usersService.create.mockImplementation(() => {
        throw new ConflictException('Email already in use');
      });

      await expect(
        controller.create({
          username: 'newuser',
          email: 'user1@example.com',
          password: 'StrongPass1!',
          full_name: 'New User',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for duplicate username', async () => {
      usersService.create.mockImplementation(() => {
        throw new ConflictException('Username already in use');
      });

      await expect(
        controller.create({
          username: 'user1',
          email: 'newuser@example.com',
          password: 'StrongPass1!',
          full_name: 'New User',
        } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('PUT /users/:id', () => {
    it('should update user successfully', async () => {
      usersService.update.mockResolvedValue({
        ...mockUser,
        username: 'updated',
      });

      const result = await controller.update(
        '1',
        { username: 'updated' } as any,
        { user: { userId: 2, role: UserRole.ADMIN } } as any,
      );

      expect(usersService.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          username: 'updated',
        }),
        expect.any(Object),
      );
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(
        controller.update(
          'abc',
          {} as any,
          { user: { userId: 2, role: UserRole.ADMIN } } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found', async () => {
      usersService.update.mockImplementation(() => {
        throw new NotFoundException('User not found');
      });

      await expect(
        controller.update(
          '999',
          {} as any,
          { user: { userId: 2, role: UserRole.ADMIN } } as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when updating role by non-admin', async () => {
      usersService.update.mockImplementation(() => {
        throw new ForbiddenException(
          'You do not have permission to update this role.',
        );
      });

      await expect(
        controller.update(
          '1',
          { role: UserRole.MANAGER } as any,
          { user: { userId: 3, role: UserRole.MANAGER } } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException for duplicate email update', async () => {
      usersService.update.mockImplementation(() => {
        throw new ConflictException('Email already in use');
      });

      await expect(
        controller.update(
          '1',
          { email: 'user2@example.com' } as any,
          { user: { userId: 2, role: UserRole.ADMIN } } as any,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for duplicate username update', async () => {
      usersService.update.mockImplementation(() => {
        throw new ConflictException('Username already in use');
      });

      await expect(
        controller.update(
          '1',
          { username: 'user2' } as any,
          { user: { userId: 2, role: UserRole.ADMIN } } as any,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for weak password', async () => {
      usersService.update.mockImplementation(() => {
        throw new BadRequestException(
          'Password must be at least 8 characters, include an uppercase letter, a number, and a special character',
        );
      });

      await expect(
        controller.update(
          '1',
          { password: 'weakpass' } as any,
          { user: { userId: 2, role: UserRole.ADMIN } } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user successfully', async () => {
      usersService.remove.mockResolvedValue({
        message: 'User deleted successfully',
      });

      const result = await controller.remove('1');

      expect(usersService.remove).toHaveBeenCalledWith(1);
      expect(result.message).toBe('User deleted successfully');
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(controller.remove('abc')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      usersService.remove.mockImplementation(() => {
        throw new NotFoundException('User not found');
      });

      await expect(controller.remove('999')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when deleting manager with buildings', async () => {
      usersService.remove.mockImplementation(() => {
        throw new ConflictException(
          'Cannot delete a manager who still manages buildings.',
        );
      });

      await expect(controller.remove('3')).rejects.toThrow(ConflictException);
    });

    it('should return message when user already deleted', async () => {
      usersService.remove.mockResolvedValue({
        message: 'User already deleted',
      });

      const result = await controller.remove('1');

      expect(result.message).toBe('User already deleted');
    });
  });

  describe('AUTHORIZATION', () => {
    it('should pass current user context to findAll', async () => {
      usersService.findAll.mockResolvedValue([mockUser]);

      await controller.findAll({
        user: { userId: 1, role: UserRole.STUDENT },
      } as any);

      expect(usersService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          role: UserRole.STUDENT,
        }),
      );
    });

    it('should pass current user context to findAllWithFilters', async () => {
      const paginatedResult = {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        data: [mockUser],
      };
      usersService.findAllWithFilters.mockResolvedValue(paginatedResult as any);

      await controller.findAll(
        { user: { userId: 1, role: UserRole.STUDENT } } as any,
        '1',
      );

      expect(usersService.findAllWithFilters).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          userId: 1,
          role: UserRole.STUDENT,
        }),
      );
    });

    it('should pass current user context to findOne', async () => {
      usersService.findOne.mockResolvedValue(mockUser);

      await controller.findOne('1', {
        user: { userId: 2, role: UserRole.ADMIN },
      } as any);

      expect(usersService.findOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          userId: 2,
          role: UserRole.ADMIN,
        }),
      );
    });

    it('should pass current user context to update', async () => {
      usersService.update.mockResolvedValue(mockUser);

      await controller.update(
        '1',
        {} as any,
        { user: { userId: 2, role: UserRole.ADMIN } } as any,
      );

      expect(usersService.update).toHaveBeenCalledWith(
        1,
        expect.any(Object),
        expect.objectContaining({
          userId: 2,
          role: UserRole.ADMIN,
        }),
      );
    });
  });

  describe('INPUT VALIDATION', () => {
    it('should validate user id is a number', async () => {
      const invalidIds = ['abc', 'user1', 'NaN'];

      for (const id of invalidIds) {
        await expect(
          controller.findOne(id, {
            user: { userId: 2, role: UserRole.ADMIN },
          } as any),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should trim filter parameters', async () => {
      const paginatedResult = {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        data: [mockUser],
      };
      usersService.findAllWithFilters.mockResolvedValue(paginatedResult as any);

      await controller.findAll(
        { user: { userId: 2, role: UserRole.ADMIN } } as any,
        '1',
        '10',
        '  user1  ',
        '  email@example.com  ',
        '  Full Name  ',
      );

      expect(usersService.findAllWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'user1',
          email: 'email@example.com',
          full_name: 'Full Name',
        }),
        expect.any(Object),
      );
    });
  });

  describe('PAGINATION & SEARCH', () => {
    it('should handle pagination parameters', async () => {
      const paginatedResult = {
        total: 100,
        page: 3,
        limit: 25,
        totalPages: 4,
        data: [],
      };
      usersService.findAllWithFilters.mockResolvedValue(paginatedResult as any);

      const result = (await controller.findAll(
        { user: { userId: 2, role: UserRole.ADMIN } } as any,
        '3',
        '25',
      )) as any;

      expect(result.page).toBe(3);
      expect(result.limit).toBe(25);
      expect(result.totalPages).toBe(4);
    });

    it('should handle role filter', async () => {
      const paginatedResult = {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        data: [mockManager],
      };
      usersService.findAllWithFilters.mockResolvedValue(paginatedResult as any);

      await controller.findAll(
        { user: { userId: 2, role: UserRole.ADMIN } } as any,
        '1',
        '10',
        undefined,
        undefined,
        undefined,
        UserRole.MANAGER,
      );

      expect(usersService.findAllWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.MANAGER,
        }),
        expect.any(Object),
      );
    });

    it('should handle status filter', async () => {
      const paginatedResult = {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        data: [{ ...mockUser, status: UserStatus.INACTIVE }],
      };
      usersService.findAllWithFilters.mockResolvedValue(paginatedResult as any);

      await controller.findAll(
        { user: { userId: 2, role: UserRole.ADMIN } } as any,
        '1',
        '10',
        undefined,
        undefined,
        undefined,
        undefined,
        UserStatus.INACTIVE,
      );

      expect(usersService.findAllWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.INACTIVE,
        }),
        expect.any(Object),
      );
    });
  });
});
