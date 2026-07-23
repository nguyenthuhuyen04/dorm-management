import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { UtilityBillsRepository } from './utility-bills.repository';

describe('UtilityBillsRepository', () => {
  let repository: UtilityBillsRepository;
  let dataSource: any;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
    distinct: jest.fn().mockReturnThis(),
  };

  const mockRepositoryMethods = {
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockManager = {
    getRepository: jest.fn().mockReturnValue(mockRepositoryMethods),
    query: jest.fn(),
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn().mockReturnValue(mockManager),
    };

    repository = new UtilityBillsRepository(dataSource as any);
    Object.defineProperty(repository, 'manager', {
      value: mockManager,
      writable: true,
    });
    (repository as any).findOne = mockRepositoryMethods.findOne;
    (repository as any).find = mockRepositoryMethods.find;
    (repository as any).createQueryBuilder =
      mockRepositoryMethods.createQueryBuilder;

    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find a bill by id with relations', async () => {
      const mockBill = {
        id: 1,
        room: { id: 1 },
        creator: { id: 1 },
        payments: [],
      };
      mockRepositoryMethods.findOne.mockResolvedValue(mockBill);

      const result = await repository.findById(1);

      expect(mockRepositoryMethods.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['room', 'room.building', 'creator', 'payments'],
      });
      expect(result).toEqual(mockBill);
    });

    it('should return null when bill not found', async () => {
      mockRepositoryMethods.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByRoomAndMonth', () => {
    it('should find a bill by room, month, year', async () => {
      const mockBill = { id: 1, roomId: 1, month: 7, year: 2026 };
      mockRepositoryMethods.findOne.mockResolvedValue(mockBill);

      const result = await repository.findByRoomAndMonth(1, 7, 2026);

      expect(mockRepositoryMethods.findOne).toHaveBeenCalledWith({
        where: { roomId: 1, month: 7, year: 2026 },
      });
      expect(result).toEqual(mockBill);
    });

    it('should return null when not found', async () => {
      mockRepositoryMethods.findOne.mockResolvedValue(null);

      const result = await repository.findByRoomAndMonth(999, 7, 2026);

      expect(result).toBeNull();
    });
  });

  describe('managerHasBuildingAccess', () => {
    it('should return true when manager has access', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 1 }]);

      const result = await repository.managerHasBuildingAccess(1, 2);

      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT EXISTS'),
        [1, 2],
      );
      expect(result).toBe(true);
    });

    it('should return false when manager has no access', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 0 }]);

      const result = await repository.managerHasBuildingAccess(1, 999);

      expect(result).toBe(false);
    });

    it('should handle empty result set', async () => {
      mockManager.query.mockResolvedValue([]);

      const result = await repository.managerHasBuildingAccess(1, 2);

      expect(result).toBe(false);
    });
  });

  describe('findByRoomId', () => {
    it('should find bills by room id', async () => {
      const mockBills = [{ id: 1 }, { id: 2 }];
      mockRepositoryMethods.find.mockResolvedValue(mockBills);

      const result = await repository.findByRoomId(1);

      expect(mockRepositoryMethods.find).toHaveBeenCalledWith({
        where: { roomId: 1 },
        relations: ['room', 'creator'],
        order: { year: 'DESC', month: 'DESC' },
      });
      expect(result).toEqual(mockBills);
    });

    it('should return empty array when no bills found', async () => {
      mockRepositoryMethods.find.mockResolvedValue([]);

      const result = await repository.findByRoomId(999);

      expect(result).toEqual([]);
    });
  });

  describe('studentHasBillAccess', () => {
    it('should return true when student has access', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 1 }]);

      const result = await repository.studentHasBillAccess(1, 3);

      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT EXISTS'),
        [1, 3],
      );
      expect(result).toBe(true);
    });

    it('should return false when student has no access', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 0 }]);

      const result = await repository.studentHasBillAccess(1, 999);

      expect(result).toBe(false);
    });

    it('should handle empty result set', async () => {
      mockManager.query.mockResolvedValue([]);

      const result = await repository.studentHasBillAccess(1, 3);

      expect(result).toBe(false);
    });
  });
});
