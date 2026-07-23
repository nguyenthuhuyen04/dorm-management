import { DataSource } from 'typeorm';
import { UsersRepository } from './users.repository';
import { User, UserRole, UserStatus } from './user.entity';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let mockManager: any;
  let dataSource: any;

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
  };

  beforeEach(async () => {
    mockManager = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
    };

    dataSource = {
      createEntityManager: jest.fn().mockReturnValue(mockManager),
    };

    repository = new UsersRepository(dataSource as any);
    Object.defineProperty(repository, 'manager', {
      value: mockManager,
      writable: true,
    });

    (repository as any).findOne = jest.fn();
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      (repository as any).findOne.mockResolvedValue(mockUser);

      const result = await repository.findByEmail('user1@example.com');

      expect((repository as any).findOne).toHaveBeenCalledWith({
        where: { email: 'user1@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by email', async () => {
      (repository as any).findOne.mockResolvedValue(null);

      const result = await repository.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      (repository as any).findOne.mockResolvedValue(mockUser);

      const result = await repository.findByUsername('user1');

      expect((repository as any).findOne).toHaveBeenCalledWith({
        where: { username: 'user1' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by username', async () => {
      (repository as any).findOne.mockResolvedValue(null);

      const result = await repository.findByUsername('notfound');

      expect(result).toBeNull();
    });
  });

  describe('findByUsernameOrEmail', () => {
    it('should find user by username', async () => {
      (repository as any).findOne.mockResolvedValue(mockUser);

      const result = await repository.findByUsernameOrEmail('user1');

      expect((repository as any).findOne).toHaveBeenCalledWith({
        where: [{ username: 'user1' }, { email: 'user1' }],
      });
      expect(result).toEqual(mockUser);
    });

    it('should find user by email', async () => {
      (repository as any).findOne.mockResolvedValue(mockUser);

      const result =
        await repository.findByUsernameOrEmail('user1@example.com');

      expect((repository as any).findOne).toHaveBeenCalledWith({
        where: [
          { username: 'user1@example.com' },
          { email: 'user1@example.com' },
        ],
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by username or email', async () => {
      (repository as any).findOne.mockResolvedValue(null);

      const result = await repository.findByUsernameOrEmail('notfound');

      expect(result).toBeNull();
    });
  });

  describe('findActiveUserById', () => {
    it('should find active user by id', async () => {
      (repository as any).findOne.mockResolvedValue(mockUser);

      const result = await repository.findActiveUserById(1);

      expect((repository as any).findOne).toHaveBeenCalledWith({
        where: { id: 1, status: UserStatus.ACTIVE },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found or inactive', async () => {
      (repository as any).findOne.mockResolvedValue(null);

      const result = await repository.findActiveUserById(1);

      expect(result).toBeNull();
    });

    it('should not return inactive users', async () => {
      (repository as any).findOne.mockResolvedValue(null);

      const result = await repository.findActiveUserById(1);

      expect((repository as any).findOne).toHaveBeenCalledWith({
        where: { id: 1, status: UserStatus.ACTIVE },
      });
      expect(result).toBeNull();
    });
  });

  describe('findUserById', () => {
    it('should find user by id regardless of status', async () => {
      (repository as any).findOne.mockResolvedValue(mockUser);

      const result = await repository.findUserById(1);

      expect((repository as any).findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      (repository as any).findOne.mockResolvedValue(null);

      const result = await repository.findUserById(999);

      expect(result).toBeNull();
    });

    it('should find inactive users', async () => {
      const inactiveUser = { ...mockUser, status: UserStatus.INACTIVE };
      (repository as any).findOne.mockResolvedValue(inactiveUser);

      const result = await repository.findUserById(1);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(UserStatus.INACTIVE);
    });
  });
});
