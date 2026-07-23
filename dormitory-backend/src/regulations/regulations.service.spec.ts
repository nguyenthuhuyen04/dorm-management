import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RegulationsService } from './regulations.service';
import { UserRole } from '../users/user.entity';

describe('RegulationsService', () => {
  let service: RegulationsService;
  let regulationsRepository: any;
  let dataSource: any;

  const mockUser = (userId: number, role: UserRole) => ({
    userId,
    role,
  });

  const mockCreator = {
    id: 1,
    fullName: 'Admin',
  };

  const mockRegulation = {
    id: 1,
    title: 'Test Regulation',
    content: 'Test content',
    createdBy: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    creator: mockCreator,
  };

  const createMockRegulation = () => ({
    ...mockRegulation,
    creator: { ...mockCreator },
  });

  const mockQueryBuilder = () => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockRegulation], 1]),
    };
    return qb;
  };

  const createServiceWithMocks = (repoMockOverrides?: Record<string, any>) => {
    const freshMock = createMockRegulation();

    const createTransactionManager = () => ({
      getRepository: jest.fn((entity: any) => {
        if (entity.name === 'Regulation') {
          return {
            create: jest.fn((data: any) => data),
            save: jest.fn(async (data: any) => ({
              ...data,
              id: data.id ?? 1,
            })),
            findOne: jest.fn().mockResolvedValue(freshMock),
            delete: jest.fn(),
          };
        }
        return { findOne: jest.fn().mockResolvedValue(null), save: jest.fn() };
      }),
    });

    const qb = mockQueryBuilder();
    const qbInstance = {
      ...qb,
      getManyAndCount: jest.fn().mockResolvedValue([[freshMock], 1]),
    };

    const repo = {
      createQueryBuilder: jest.fn().mockReturnValue(qbInstance),
      findById: jest.fn().mockResolvedValue(freshMock),
      manager: {
        transaction: jest.fn(async (callback: any) =>
          callback(createTransactionManager()),
        ),
      },
      ...(repoMockOverrides || {}),
    };

    const ds = {
      manager: {
        findOne: jest.fn(),
      },
      transaction: jest.fn(async (callback: any) =>
        callback(createTransactionManager()),
      ),
    };

    const svc = new RegulationsService(repo as any, ds as any);
    return { service: svc, repo, dataSource: ds };
  };

  // ─── FIND ALL ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated regulations', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(
        { page: 1, limit: 10 },
        mockUser(1, UserRole.ADMIN),
      );

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Test Regulation');
    });

    it('should apply search query on title and content', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ search: 'Test' }, mockUser(1, UserRole.ADMIN));

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(LOWER(regulation.title) LIKE :search OR LOWER(regulation.content) LIKE :search)',
        expect.any(Object),
      );
    });

    it('should apply created_by filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ created_by: '1' }, mockUser(1, UserRole.ADMIN));

      expect(qb.andWhere).toHaveBeenCalledWith(
        'regulation.createdBy = :createdBy',
        { createdBy: 1 },
      );
    });

    it('should apply pagination correctly', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 2, limit: 5 }, mockUser(1, UserRole.ADMIN));

      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('should return empty result set gracefully', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(
        { search: 'ZZZZNONEXISTENT' },
        mockUser(1, UserRole.ADMIN),
      );

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should apply sorting: updated_at DESC, created_at DESC', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, mockUser(1, UserRole.ADMIN));

      expect(qb.orderBy).toHaveBeenCalledWith('regulation.updatedAt', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith(
        'regulation.createdAt',
        'DESC',
      );
    });
  });

  // ─── FIND ONE ────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should find a regulation by id', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockRegulation);

      const result = await service.findOne(1, mockUser(1, UserRole.ADMIN));

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Regulation');
    });

    it('should throw NotFoundException when regulation not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.findOne(999, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow MANAGER to view regulations', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockRegulation);

      const result = await service.findOne(1, mockUser(2, UserRole.MANAGER));

      expect(result).toBeDefined();
    });

    it('should allow STUDENT to view regulations', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockRegulation);

      const result = await service.findOne(1, mockUser(3, UserRole.STUDENT));

      expect(result).toBeDefined();
    });
  });

  // ─── CREATE ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a regulation successfully', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'User')
          return Promise.resolve({ id: 1, fullName: 'Admin' });
        if (entity.name === 'Regulation') return Promise.resolve(null); // no duplicate
        return Promise.resolve(null);
      });

      const result = await service.create(
        {
          title: 'New Regulation',
          content: 'New content',
        },
        mockUser(1, UserRole.ADMIN),
      );

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Regulation');
    });

    it('should reject if user not found in DB', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.create(
          {
            title: 'New Regulation',
            content: 'New content',
          },
          mockUser(999, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject duplicate title', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'User')
          return Promise.resolve({ id: 1, fullName: 'Admin' });
        if (entity.name === 'Regulation')
          return Promise.resolve({ id: 2, title: 'Existing Title' });
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            title: 'Existing Title',
            content: 'New content',
          },
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for whitespace-only title', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'User')
          return Promise.resolve({ id: 1, fullName: 'Admin' });
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            title: '   ',
            content: 'New content',
          },
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for whitespace-only content', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'User')
          return Promise.resolve({ id: 1, fullName: 'Admin' });
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            title: 'New Title',
            content: '   ',
          },
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should use transaction for creation', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'User')
          return Promise.resolve({ id: 1, fullName: 'Admin' });
        if (entity.name === 'Regulation') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      await service.create(
        {
          title: 'New Regulation',
          content: 'New content',
        },
        mockUser(1, UserRole.ADMIN),
      );

      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  // ─── UPDATE ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update a regulation successfully', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockRegulation());
      dataSource.manager.findOne = jest.fn().mockResolvedValue(null); // no duplicate

      const result = await service.update(
        1,
        { title: 'Updated Title', content: 'Updated content' },
        mockUser(1, UserRole.ADMIN),
      );

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when regulation not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.update(999, { title: 'Updated' }, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject duplicate title on update', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...createMockRegulation(),
        title: 'Original Title',
      });
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Regulation')
          return Promise.resolve({
            id: 99,
            title: 'Existing Title',
          });
        return Promise.resolve(null);
      });

      await expect(
        service.update(
          1,
          { title: 'Existing Title' },
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating to the same title (no duplicate check)', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...createMockRegulation(),
        title: 'Same Title',
      });

      const result = await service.update(
        1,
        { title: 'Same Title' },
        mockUser(1, UserRole.ADMIN),
      );

      expect(result).toBeDefined();
    });

    it('should throw ConflictException for whitespace-only title on update', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockRegulation());

      await expect(
        service.update(1, { title: '   ' }, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(ConflictException);
    });

    it('should use transaction for update', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockRegulation());
      dataSource.manager.findOne = jest.fn().mockResolvedValue(null);

      await service.update(
        1,
        { title: 'Updated' },
        mockUser(1, UserRole.ADMIN),
      );

      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  // ─── REMOVE ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete a regulation successfully', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockRegulation);

      const result = await service.remove(1, mockUser(1, UserRole.ADMIN));

      expect(result).toEqual({ message: 'Regulation deleted successfully' });
    });

    it('should throw NotFoundException when regulation not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.remove(999, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use transaction for delete', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockRegulation);

      await service.remove(1, mockUser(1, UserRole.ADMIN));

      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  // ─── AUTHORIZATION ──────────────────────────────────────────────────────

  describe('authorization', () => {
    it('should allow ADMIN full access', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      repo.findById.mockResolvedValue(mockRegulation);

      await expect(
        service.findAll({}, mockUser(1, UserRole.ADMIN)),
      ).resolves.toBeDefined();
      await expect(
        service.findOne(1, mockUser(1, UserRole.ADMIN)),
      ).resolves.toBeDefined();
    });

    it('should allow MANAGER to view regulations', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      repo.findById.mockResolvedValue(mockRegulation);

      await expect(
        service.findAll({}, mockUser(2, UserRole.MANAGER)),
      ).resolves.toBeDefined();
      await expect(
        service.findOne(1, mockUser(2, UserRole.MANAGER)),
      ).resolves.toBeDefined();
    });

    it('should allow STUDENT to view regulations', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      repo.findById.mockResolvedValue(mockRegulation);

      await expect(
        service.findAll({}, mockUser(3, UserRole.STUDENT)),
      ).resolves.toBeDefined();
      await expect(
        service.findOne(1, mockUser(3, UserRole.STUDENT)),
      ).resolves.toBeDefined();
    });
  });
});
