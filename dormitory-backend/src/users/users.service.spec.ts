import {
  ForbiddenException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole, UserStatus } from './user.entity';
import { hash } from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let repository: any;

  const mockUser = {
    id: 1,
    username: 'user1',
    fullName: 'User One',
    email: 'user1@example.com',
    phone: '123456789',
    password: 'hashed_password',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
  };

  const mockAdmin = {
    ...mockUser,
    id: 2,
    username: 'admin',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const mockManager = {
    ...mockUser,
    id: 3,
    username: 'manager1',
    email: 'manager1@example.com',
    role: UserRole.MANAGER,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByUsernameOrEmail: jest.fn(),
      findActiveUserById: jest.fn(),
      findUserById: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    service = new UsersService(repository);
    (hash as jest.Mock).mockResolvedValue('hashed_password');
  });

  describe('CREATE', () => {
    it('should create a user successfully', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.findByUsername.mockResolvedValue(null);
      repository.create.mockImplementation((user: any) => user);
      repository.save.mockResolvedValue(mockUser);

      const result = await service.create({
        username: 'user1',
        email: 'user1@example.com',
        password: 'StrongPass1!',
        full_name: 'User One',
      } as any);

      expect(hash).toHaveBeenCalledWith('StrongPass1!', 10);
      expect(repository.save).toHaveBeenCalled();
      expect(result.id).toBe(1);
    });

    it('should throw ConflictException when email already exists', async () => {
      repository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.create({
          username: 'newuser',
          email: 'user1@example.com',
          password: 'StrongPass1!',
          full_name: 'New User',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when username already exists', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.findByUsername.mockResolvedValue(mockUser);

      await expect(
        service.create({
          username: 'user1',
          email: 'newuser@example.com',
          password: 'StrongPass1!',
          full_name: 'New User',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password with bcrypt', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.findByUsername.mockResolvedValue(null);
      repository.create.mockImplementation((user: any) => user);
      repository.save.mockResolvedValue(mockUser);

      await service.create({
        username: 'user1',
        email: 'user1@example.com',
        password: 'StrongPass1!',
        full_name: 'User One',
      } as any);

      expect(hash).toHaveBeenCalledWith('StrongPass1!', 10);
    });

    it('should create with default role and status', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.findByUsername.mockResolvedValue(null);
      repository.create.mockImplementation((user: any) => user);
      repository.save.mockResolvedValue({
        ...mockUser,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      });

      await service.create({
        username: 'user1',
        email: 'user1@example.com',
        password: 'StrongPass1!',
        full_name: 'User One',
      } as any);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        }),
      );
    });

    it('should map full_name to fullName', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.findByUsername.mockResolvedValue(null);
      repository.create.mockImplementation((user: any) => user);
      repository.save.mockResolvedValue(mockUser);

      await service.create({
        username: 'user1',
        email: 'user1@example.com',
        password: 'StrongPass1!',
        full_name: 'User One',
      } as any);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'User One',
        }),
      );
    });
  });

  describe('FIND ALL', () => {
    it('should find all active users', async () => {
      repository.find.mockResolvedValue([mockUser]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        where: { status: UserStatus.ACTIVE },
        order: { id: 'ASC' },
      });
      expect(result.length).toBe(1);
    });

    it('should filter by scope for students (only self)', async () => {
      repository.find.mockResolvedValue([mockUser]);

      await service.findAll({
        userId: 1,
        role: UserRole.STUDENT,
      });

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          status: UserStatus.ACTIVE,
          id: 1,
        },
        order: { id: 'ASC' },
      });
    });

    it('should filter by scope for managers (only students)', async () => {
      repository.find.mockResolvedValue([mockUser]);

      await service.findAll({
        userId: 3,
        role: UserRole.MANAGER,
      });

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          status: UserStatus.ACTIVE,
          role: UserRole.STUDENT,
        },
        order: { id: 'ASC' },
      });
    });

    it('should show all users for admin', async () => {
      repository.find.mockResolvedValue([mockUser, mockManager]);

      await service.findAll({
        userId: 2,
        role: UserRole.ADMIN,
      });

      expect(repository.find).toHaveBeenCalledWith({
        where: { status: UserStatus.ACTIVE },
        order: { id: 'ASC' },
      });
    });
  });

  describe('FIND ALL WITH FILTERS', () => {
    it('should paginate results', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAllWithFilters({
        page: 2,
        limit: 10,
      });

      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should cap limit at 100', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAllWithFilters({
        page: 1,
        limit: 100000,
      });

      expect(queryBuilder.take).toHaveBeenCalledWith(100);
      expect(result.limit).toBe(100);
    });

    it('should search by username', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.findAllWithFilters({
        page: 1,
        limit: 10,
        username: 'user1',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(user.username) LIKE :username',
        expect.any(Object),
      );
    });

    it('should search by email', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.findAllWithFilters({
        page: 1,
        limit: 10,
        email: 'user1@example.com',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(user.email) LIKE :email',
        expect.any(Object),
      );
    });

    it('should search by full name', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.findAllWithFilters({
        page: 1,
        limit: 10,
        full_name: 'User One',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(user.fullName) LIKE :fullName',
        expect.any(Object),
      );
    });

    it('should filter by role', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockManager], 1]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.findAllWithFilters({
        page: 1,
        limit: 10,
        role: UserRole.MANAGER,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.role = :role', {
        role: UserRole.MANAGER,
      });
    });

    it('should sort by specified column', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.findAllWithFilters({
        page: 1,
        limit: 10,
        sortBy: 'username',
        sortOrder: 'DESC',
      });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'user.username',
        'DESC',
      );
    });

    it('should use default sort column for invalid sortBy', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.findAllWithFilters({
        page: 1,
        limit: 10,
        sortBy: 'invalidColumn',
      });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('user.id', 'ASC');
    });

    it('should apply visibility scope for managers', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.findAllWithFilters(
        {
          page: 1,
          limit: 10,
        },
        {
          userId: 3,
          role: UserRole.MANAGER,
        },
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'user.role = :studentRole',
        { studentRole: UserRole.STUDENT },
      );
    });

    it('should calculate total pages correctly', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 25]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAllWithFilters({
        page: 1,
        limit: 10,
      });

      expect(result.totalPages).toBe(3);
    });
  });

  describe('FIND ONE', () => {
    it('should find active user by id', async () => {
      repository.findActiveUserById.mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findActiveUserById.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should allow admin to access any user', async () => {
      repository.findActiveUserById.mockResolvedValue(mockUser);

      const result = await service.findOne(1, {
        userId: 2,
        role: UserRole.ADMIN,
      });

      expect(result).toEqual(mockUser);
    });

    it('should allow student to access own profile', async () => {
      repository.findActiveUserById.mockResolvedValue(mockUser);

      const result = await service.findOne(1, {
        userId: 1,
        role: UserRole.STUDENT,
      });

      expect(result).toEqual(mockUser);
    });

    it('should forbid student from accessing other profiles', async () => {
      repository.findActiveUserById.mockResolvedValue(mockManager);

      await expect(
        service.findOne(3, {
          userId: 1,
          role: UserRole.STUDENT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow manager to access student profile', async () => {
      repository.findActiveUserById.mockResolvedValue(mockUser);

      const result = await service.findOne(1, {
        userId: 3,
        role: UserRole.MANAGER,
      });

      expect(result).toEqual(mockUser);
    });

    it('should forbid manager from accessing admin profile', async () => {
      repository.findActiveUserById.mockResolvedValue(mockAdmin);

      await expect(
        service.findOne(2, {
          userId: 3,
          role: UserRole.MANAGER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('UPDATE', () => {
    it('should update user successfully', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.save.mockResolvedValue({ ...mockUser, username: 'updated' });
      repository.findActiveUserById.mockResolvedValue({
        ...mockUser,
        username: 'updated',
      });

      const result = await service.update(1, { username: 'updated' } as any);

      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(999, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update username when not duplicated', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.findByUsername.mockResolvedValue(null);
      repository.save.mockResolvedValue(mockUser);
      repository.findActiveUserById.mockResolvedValue(mockUser);

      await service.update(1, { username: 'newusername' } as any);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'newusername',
        }),
      );
    });

    it('should throw ConflictException when updating to duplicate username', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.findByUsername.mockResolvedValue(mockManager);

      await expect(
        service.update(1, { username: 'manager1' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating to same username', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.findByUsername.mockResolvedValue(null);
      repository.save.mockResolvedValue(mockUser);
      repository.findActiveUserById.mockResolvedValue(mockUser);

      await service.update(1, { username: 'user1' } as any);

      expect(repository.save).toHaveBeenCalled();
    });

    it('should update email when not duplicated', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.findByEmail.mockResolvedValue(null);
      repository.save.mockResolvedValue(mockUser);
      repository.findActiveUserById.mockResolvedValue(mockUser);

      await service.update(1, { email: 'newemail@example.com' } as any);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newemail@example.com',
        }),
      );
    });

    it('should throw ConflictException when updating to duplicate email', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.findByEmail.mockResolvedValue(mockManager);

      await expect(
        service.update(1, { email: 'manager1@example.com' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash new password', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.save.mockResolvedValue(mockUser);
      repository.findActiveUserById.mockResolvedValue(mockUser);

      await service.update(1, { password: 'NewPass123!' } as any);

      expect(hash).toHaveBeenCalledWith('NewPass123!', 10);
    });

    it('should throw BadRequestException for weak password', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.update(1, { password: 'weakpass' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update role only by admin', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.save.mockResolvedValue(mockUser);
      repository.findActiveUserById.mockResolvedValue(mockUser);

      await service.update(1, { role: UserRole.MANAGER } as any, {
        userId: 2,
        role: UserRole.ADMIN,
      });

      expect(repository.save).toHaveBeenCalled();
    });

    it('should forbid non-admin from updating role', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.update(1, { role: UserRole.MANAGER } as any, {
          userId: 3,
          role: UserRole.MANAGER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update status', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.save.mockResolvedValue(mockUser);
      repository.findActiveUserById.mockResolvedValue(mockUser);

      await service.update(1, { status: UserStatus.INACTIVE } as any);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.INACTIVE,
        }),
      );
    });

    it('should update phone', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.save.mockResolvedValue(mockUser);
      repository.findActiveUserById.mockResolvedValue(mockUser);

      await service.update(1, { phone: '987654321' } as any);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '987654321',
        }),
      );
    });

    it('should update full_name', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.save.mockResolvedValue(mockUser);
      repository.findActiveUserById.mockResolvedValue(mockUser);

      await service.update(1, { full_name: 'New Name' } as any);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'New Name',
        }),
      );
    });
  });

  describe('REMOVE', () => {
    it('should delete user successfully', async () => {
      const userToDelete = {
        ...mockUser,
        status: UserStatus.ACTIVE,
        managedBuildings: [],
      };
      repository.findOne.mockResolvedValue(userToDelete);
      repository.save.mockResolvedValue({
        ...userToDelete,
        status: UserStatus.INACTIVE,
      });

      const result = await service.remove(1);

      expect(result.message).toBe('User deleted successfully');
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.INACTIVE,
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should return message when user already deleted', async () => {
      repository.findOne.mockResolvedValue({
        ...mockUser,
        status: UserStatus.INACTIVE,
      });

      const result = await service.remove(1);

      expect(result.message).toBe('User already deleted');
    });

    it('should forbid deleting manager with managed buildings', async () => {
      repository.findOne.mockResolvedValue({
        ...mockManager,
        managedBuildings: [{ id: 1, name: 'Building 1' }],
      });

      await expect(service.remove(3)).rejects.toThrow(ConflictException);
    });

    it('should allow deleting manager without buildings', async () => {
      repository.findOne.mockResolvedValue({
        ...mockManager,
        managedBuildings: [],
      });
      repository.save.mockResolvedValue(mockManager);

      const result = await service.remove(3);

      expect(result.message).toBe('User deleted successfully');
    });
  });

  describe('FIND BY EMAIL', () => {
    it('should find user by email', async () => {
      repository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.findByEmail('user1@example.com');

      expect(result).toEqual(mockUser);
      expect(repository.findByEmail).toHaveBeenCalledWith('user1@example.com');
    });

    it('should return null when email not found', async () => {
      repository.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('FIND BY USERNAME OR EMAIL', () => {
    it('should find user by username', async () => {
      repository.findByUsernameOrEmail.mockResolvedValue(mockUser);

      const result = await service.findByUsernameOrEmail('user1');

      expect(result).toEqual(mockUser);
    });

    it('should find user by email', async () => {
      repository.findByUsernameOrEmail.mockResolvedValue(mockUser);

      const result = await service.findByUsernameOrEmail('user1@example.com');

      expect(result).toEqual(mockUser);
    });

    it('should return null when not found', async () => {
      repository.findByUsernameOrEmail.mockResolvedValue(null);

      const result = await service.findByUsernameOrEmail('notfound');

      expect(result).toBeNull();
    });
  });

  describe('AUTHORIZATION', () => {
    it('should forbid student from accessing other user profiles', async () => {
      repository.findActiveUserById.mockResolvedValue(mockManager);

      await expect(
        service.findOne(3, {
          userId: 1,
          role: UserRole.STUDENT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forbid manager from accessing manager profile', async () => {
      repository.findActiveUserById.mockResolvedValue({
        ...mockManager,
        id: 4,
      });

      await expect(
        service.findOne(4, {
          userId: 3,
          role: UserRole.MANAGER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forbid updating role by non-admin', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.update(1, { role: UserRole.ADMIN } as any, {
          userId: 3,
          role: UserRole.MANAGER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('PAGINATION', () => {
    it('should use default page 1', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAllWithFilters({
        page: 0,
        limit: 10,
      } as any);

      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(result.page).toBe(1);
    });

    it('should use default limit 10', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAllWithFilters({} as any);

      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.limit).toBe(10);
    });
  });
});
