import { DataSource } from 'typeorm';
import { AnnouncementsRepository } from './announcements.repository';
import { Announcement } from './announcement.entity';

describe('AnnouncementsRepository', () => {
  let repository: AnnouncementsRepository;
  let dataSource: any;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };

  const mockRepositoryMethods = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockManager = {
    getRepository: jest.fn().mockReturnValue(mockRepositoryMethods),
    query: jest.fn(),
    transaction: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn().mockReturnValue(mockManager),
    };

    repository = new AnnouncementsRepository(dataSource as any);
    Object.defineProperty(repository, 'manager', {
      value: mockManager,
      writable: true,
    });
    (repository as any).findOne = mockRepositoryMethods.findOne;
    (repository as any).find = mockRepositoryMethods.find;
    (repository as any).count = mockRepositoryMethods.count;
    (repository as any).createQueryBuilder =
      mockRepositoryMethods.createQueryBuilder;

    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find an announcement by id with relations', async () => {
      const mockAnnouncement = {
        id: 1,
        title: 'Test',
        creator: { id: 2, fullName: 'Manager' },
      };
      mockRepositoryMethods.findOne.mockResolvedValue(mockAnnouncement);

      const result = await repository.findById(1);

      expect(mockRepositoryMethods.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['creator'],
      });
      expect(result).toEqual(mockAnnouncement);
    });

    it('should return null when announcement not found', async () => {
      mockRepositoryMethods.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByCreator', () => {
    it('should find announcements by creator id', async () => {
      const mockAnnouncements = [{ id: 1, title: 'Test', createdBy: 2 }];
      mockRepositoryMethods.find.mockResolvedValue(mockAnnouncements);

      const result = await repository.findByCreator(2);

      expect(mockRepositoryMethods.find).toHaveBeenCalledWith({
        where: { createdBy: 2 },
        relations: ['creator'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockAnnouncements);
    });
  });

  describe('managerOwnsAnnouncement', () => {
    it('should return true when manager owns the announcement', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 1 }]);

      const result = await repository.managerOwnsAnnouncement(1, 2);

      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT EXISTS'),
        [1, 2],
      );
      expect(result).toBe(true);
    });

    it('should return false when manager does not own the announcement', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 0 }]);

      const result = await repository.managerOwnsAnnouncement(1, 999);

      expect(result).toBe(false);
    });

    it('should handle empty result set', async () => {
      mockManager.query.mockResolvedValue([]);

      const result = await repository.managerOwnsAnnouncement(1, 2);

      expect(result).toBe(false);
    });
  });
});
