import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ContractsRepository } from './contracts.repository';
import { Contract } from './contract.entity';

describe('ContractsRepository', () => {
  let repository: ContractsRepository;
  let dataSource: any;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
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
    count: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    create: jest.fn(),
    save: jest.fn(),
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

    repository = new ContractsRepository(dataSource as any);
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
    it('should find a contract by id with relations', async () => {
      const mockContract = {
        id: 1,
        contractCode: 'HD001',
        student: { id: 1 },
        room: { id: 1 },
        creator: { id: 1 },
      };
      mockRepositoryMethods.findOne.mockResolvedValue(mockContract);

      const result = await repository.findById(1);

      expect(mockRepositoryMethods.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: [
          'student',
          'student.user',
          'room',
          'room.building',
          'creator',
        ],
      });
      expect(result).toEqual(mockContract);
    });

    it('should return null when contract not found', async () => {
      mockRepositoryMethods.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByContractCode', () => {
    it('should find a contract by code', async () => {
      const mockContract = { id: 1, contractCode: 'HD001' };
      mockRepositoryMethods.findOne.mockResolvedValue(mockContract);

      const result = await repository.findByContractCode('HD001');

      expect(mockRepositoryMethods.findOne).toHaveBeenCalledWith({
        where: { contractCode: 'HD001' },
      });
      expect(result).toEqual(mockContract);
    });

    it('should return null when not found', async () => {
      mockRepositoryMethods.findOne.mockResolvedValue(null);

      const result = await repository.findByContractCode('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('countActiveContractsByStudent', () => {
    it('should return count of active contracts for a student', async () => {
      mockRepositoryMethods.count.mockResolvedValue(1);

      const result = await repository.countActiveContractsByStudent(1);

      expect(mockRepositoryMethods.count).toHaveBeenCalledWith({
        where: { studentId: 1, status: 'ACTIVE' },
      });
      expect(result).toBe(1);
    });

    it('should return 0 when no active contracts', async () => {
      mockRepositoryMethods.count.mockResolvedValue(0);

      const result = await repository.countActiveContractsByStudent(1);

      expect(result).toBe(0);
    });
  });

  describe('countActiveContractsByRoom', () => {
    it('should return count of active contracts for a room', async () => {
      mockRepositoryMethods.count.mockResolvedValue(2);

      const result = await repository.countActiveContractsByRoom(1);

      expect(mockRepositoryMethods.count).toHaveBeenCalledWith({
        where: { roomId: 1, status: 'ACTIVE' },
      });
      expect(result).toBe(2);
    });
  });

  describe('getActiveOccupancy', () => {
    it('should return active occupancy count using raw query', async () => {
      mockManager.query.mockResolvedValue([{ count: 3 }]);

      const result = await repository.getActiveOccupancy(1);

      expect(mockManager.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) AS count FROM contracts WHERE room_id = ? AND status = ?',
        [1, 'ACTIVE'],
      );
      expect(result).toBe(3);
    });

    it('should return 0 when no active contracts', async () => {
      mockManager.query.mockResolvedValue([{ count: 0 }]);

      const result = await repository.getActiveOccupancy(1);

      expect(result).toBe(0);
    });

    it('should handle empty result set', async () => {
      mockManager.query.mockResolvedValue([]);

      const result = await repository.getActiveOccupancy(1);

      expect(result).toBe(0);
    });
  });

  describe('hasActiveContractForStudent', () => {
    it('should return true when student has active contract', async () => {
      mockRepositoryMethods.count.mockResolvedValue(1);

      const result = await repository.hasActiveContractForStudent(1);

      expect(result).toBe(true);
    });

    it('should return false when no active contract', async () => {
      mockRepositoryMethods.count.mockResolvedValue(0);

      const result = await repository.hasActiveContractForStudent(1);

      expect(result).toBe(false);
    });
  });

  describe('hasPaymentsForContract', () => {
    it('should return true when contract has payments', async () => {
      mockManager.query.mockResolvedValue([{ count: 1 }]);

      const result = await repository.hasPaymentsForContract(1);

      expect(result).toBe(true);
    });

    it('should return false when no payments', async () => {
      mockManager.query.mockResolvedValue([{ count: 0 }]);

      const result = await repository.hasPaymentsForContract(1);

      expect(result).toBe(false);
    });
  });

  describe('managerHasContractAccess', () => {
    it('should return true when manager has access', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 1 }]);

      const result = await repository.managerHasContractAccess(1, 2);

      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT EXISTS'),
        [1, 2],
      );
      expect(result).toBe(true);
    });

    it('should return false when manager has no access', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 0 }]);

      const result = await repository.managerHasContractAccess(1, 999);

      expect(result).toBe(false);
    });

    it('should handle empty result set', async () => {
      mockManager.query.mockResolvedValue([]);

      const result = await repository.managerHasContractAccess(1, 2);

      expect(result).toBe(false);
    });
  });
});
