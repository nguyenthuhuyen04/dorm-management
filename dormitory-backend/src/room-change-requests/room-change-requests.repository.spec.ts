import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { RoomChangeRequestsRepository } from './room-change-requests.repository';
import { RoomChangeRequest } from './room-change-request.entity';

describe('RoomChangeRequestsRepository', () => {
  let repository: RoomChangeRequestsRepository;
  let dataSource: any;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
  };

  const mockRepositoryMethods = {
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
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

    repository = new RoomChangeRequestsRepository(dataSource as any);
    Object.defineProperty(repository, 'manager', {
      value: mockManager,
      writable: true,
    });
    (repository as any).findOne = mockRepositoryMethods.findOne;
    (repository as any).count = mockRepositoryMethods.count;
    (repository as any).create = mockRepositoryMethods.create;
    (repository as any).save = mockRepositoryMethods.save;
    (repository as any).delete = mockRepositoryMethods.delete;
    (repository as any).createQueryBuilder = jest
      .fn()
      .mockReturnValue(mockQueryBuilder);

    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a request with relations', async () => {
      const mockRequest = { id: 1 } as RoomChangeRequest;
      mockRepositoryMethods.findOne.mockResolvedValue(mockRequest);

      const result = await repository.findById(1);

      expect(mockRepositoryMethods.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: [
          'student',
          'student.user',
          'currentRoom',
          'currentRoom.building',
          'requestedRoom',
          'requestedRoom.building',
          'approver',
        ],
      });
      expect(result).toEqual(mockRequest);
    });
  });

  describe('hasPendingRequestForStudent', () => {
    it('should return true when pending request exists', async () => {
      mockRepositoryMethods.count.mockResolvedValue(1);
      const result = await repository.hasPendingRequestForStudent(1);
      expect(result).toBe(true);
      expect(mockRepositoryMethods.count).toHaveBeenCalledWith({
        where: { studentId: 1, status: 'PENDING' },
      });
    });

    it('should return false when none exists', async () => {
      mockRepositoryMethods.count.mockResolvedValue(0);
      const result = await repository.hasPendingRequestForStudent(1);
      expect(result).toBe(false);
    });
  });

  describe('managerHasAccessToRequest', () => {
    it('should query manager access', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 1 }]);
      const result = await repository.managerHasAccessToRequest(1, 2);
      expect(result).toBe(true);
      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT EXISTS'),
        [1, 2, 2],
      );
    });

    it('should return false when no access', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 0 }]);
      const result = await repository.managerHasAccessToRequest(1, 2);
      expect(result).toBe(false);
    });
  });

  describe('studentHasAccess', () => {
    it('should query student access', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 1 }]);
      const result = await repository.studentHasAccess(1, 1);
      expect(result).toBe(true);
      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT EXISTS'),
        [1, 1],
      );
    });

    it('should return false when no access', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 0 }]);
      const result = await repository.studentHasAccess(1, 1);
      expect(result).toBe(false);
    });
  });
});
