import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsRepository } from './announcements.repository';
import { UserRole } from '../users/user.entity';
import { TargetRole } from '../common/enums/user-role.enum';

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;
  let announcementsRepository: any;
  let dataSource: any;

  const mockUser = (userId: number, role: UserRole) => ({
    userId,
    role,
  });

  const mockCreator = {
    id: 2,
    fullName: 'Manager One',
  };

  const mockAnnouncement = {
    id: 1,
    title: 'Test Announcement',
    content: 'Test content',
    targetRole: TargetRole.ALL,
    createdBy: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    creator: mockCreator,
  };

  const mockQueryBuilder = () => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockAnnouncement], 1]),
    };
    return qb;
  };

  const createMockAnnouncement = () => ({
    ...mockAnnouncement,
    creator: { ...mockCreator },
  });

  const createServiceWithMocks = (repoMockOverrides?: Record<string, any>) => {
    const freshMock = createMockAnnouncement();

    const createTransactionManager = () => ({
      getRepository: jest.fn((entity: any) => {
        if (entity.name === 'Announcement') {
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
      findByCreator: jest.fn(),
      managerOwnsAnnouncement: jest.fn(),
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

    const svc = new AnnouncementsService(repo as any, ds as any);
    return { service: svc, repo, dataSource: ds };
  };

  // ─── FIND ALL ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated announcements for ADMIN', async () => {
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
      expect(result.data[0].title).toBe('Test Announcement');
    });

    it('should scope results for STUDENT role', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({}, mockUser(3, UserRole.STUDENT));

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(announcement.targetRole = :targetAll OR announcement.targetRole = :targetStudent)',
        { targetAll: TargetRole.ALL, targetStudent: TargetRole.STUDENT },
      );
    });

    it('should scope results for MANAGER role', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({}, mockUser(2, UserRole.MANAGER));

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(announcement.targetRole = :targetAll OR announcement.targetRole = :targetManager)',
        { targetAll: TargetRole.ALL, targetManager: TargetRole.MANAGER },
      );
    });

    it('should apply search query on title and content', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ search: 'Test' }, mockUser(1, UserRole.ADMIN));

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(LOWER(announcement.title) LIKE :search OR LOWER(announcement.content) LIKE :search)',
        expect.any(Object),
      );
    });

    it('should apply target_role filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { target_role: 'STUDENT' },
        mockUser(1, UserRole.ADMIN),
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'announcement.targetRole = :targetRole',
        { targetRole: 'STUDENT' },
      );
    });

    it('should apply created_by filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ created_by: '2' }, mockUser(1, UserRole.ADMIN));

      expect(qb.andWhere).toHaveBeenCalledWith(
        'announcement.createdBy = :createdBy',
        { createdBy: 2 },
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
  });

  // ─── FIND ONE ────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should find an announcement by id for ADMIN', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockAnnouncement);

      const result = await service.findOne(1, mockUser(1, UserRole.ADMIN));

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Announcement');
    });

    it('should throw NotFoundException when announcement not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.findOne(999, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow STUDENT to view ALL or STUDENT targeted announcements', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...mockAnnouncement,
        targetRole: TargetRole.STUDENT,
      });

      const result = await service.findOne(1, mockUser(3, UserRole.STUDENT));

      expect(result).toBeDefined();
    });

    it('should reject STUDENT accessing MANAGER targeted announcement', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...mockAnnouncement,
        targetRole: TargetRole.MANAGER,
      });

      await expect(
        service.findOne(1, mockUser(3, UserRole.STUDENT)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow MANAGER to view ALL or MANAGER targeted announcements', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...mockAnnouncement,
        targetRole: TargetRole.MANAGER,
      });

      const result = await service.findOne(1, mockUser(2, UserRole.MANAGER));

      expect(result).toBeDefined();
    });

    it('should reject MANAGER accessing STUDENT targeted announcement', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...mockAnnouncement,
        targetRole: TargetRole.STUDENT,
      });

      await expect(
        service.findOne(1, mockUser(2, UserRole.MANAGER)),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── CREATE ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create an announcement successfully', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'User')
          return Promise.resolve({ id: 1, fullName: 'Admin' });
        return Promise.resolve(null);
      });

      const result = await service.create(
        {
          title: 'New Announcement',
          content: 'New content',
          target_role: TargetRole.ALL,
        },
        mockUser(1, UserRole.ADMIN),
      );

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Announcement');
    });

    it('should reject if user not found in DB', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.create(
          {
            title: 'New Announcement',
            content: 'New content',
            target_role: TargetRole.ALL,
          },
          mockUser(999, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use transaction for creation', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'User')
          return Promise.resolve({ id: 1, fullName: 'Admin' });
        return Promise.resolve(null);
      });

      await service.create(
        {
          title: 'New Announcement',
          content: 'New content',
          target_role: TargetRole.ALL,
        },
        mockUser(1, UserRole.ADMIN),
      );

      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  // ─── UPDATE ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update an announcement successfully', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockAnnouncement());

      const result = await service.update(
        1,
        { title: 'Updated Title' },
        mockUser(1, UserRole.ADMIN),
      );

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when announcement not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.update(999, { title: 'Updated' }, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject MANAGER updating another user announcement', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...createMockAnnouncement(),
        createdBy: 99,
      });

      await expect(
        service.update(1, { title: 'Updated' }, mockUser(2, UserRole.MANAGER)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow MANAGER to update own announcements', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...createMockAnnouncement(),
        createdBy: 2,
      });

      const result = await service.update(
        1,
        { title: 'Updated' },
        mockUser(2, UserRole.MANAGER),
      );

      expect(result).toBeDefined();
    });

    it('should use transaction for update', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockAnnouncement());

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
    it('should delete an announcement successfully', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockAnnouncement);

      const result = await service.remove(1, mockUser(1, UserRole.ADMIN));

      expect(result).toEqual({ message: 'Announcement deleted successfully' });
    });

    it('should throw NotFoundException when announcement not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.remove(999, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject MANAGER deleting another user announcement', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...createMockAnnouncement(),
        createdBy: 99,
      });

      await expect(
        service.remove(1, mockUser(2, UserRole.MANAGER)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow MANAGER to delete own announcements', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...createMockAnnouncement(),
        createdBy: 2,
      });

      const result = await service.remove(1, mockUser(2, UserRole.MANAGER));

      expect(result).toEqual({ message: 'Announcement deleted successfully' });
    });

    it('should use transaction for delete', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockAnnouncement);

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
      repo.findById.mockResolvedValue(mockAnnouncement);

      await expect(
        service.findAll({}, mockUser(1, UserRole.ADMIN)),
      ).resolves.toBeDefined();
      await expect(
        service.findOne(1, mockUser(1, UserRole.ADMIN)),
      ).resolves.toBeDefined();
    });

    it('should enforce STUDENT scoping in findAll', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({}, mockUser(3, UserRole.STUDENT));

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(announcement.targetRole = :targetAll OR announcement.targetRole = :targetStudent)',
        expect.any(Object),
      );
    });

    it('should enforce MANAGER scoping in findAll', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({}, mockUser(2, UserRole.MANAGER));

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(announcement.targetRole = :targetAll OR announcement.targetRole = :targetManager)',
        expect.any(Object),
      );
    });
  });
});
