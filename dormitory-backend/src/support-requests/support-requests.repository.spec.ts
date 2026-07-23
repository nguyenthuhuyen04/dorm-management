import { DataSource } from 'typeorm';
import { SupportRequestsRepository } from './support-requests.repository';
import { SupportRequest } from './support-request.entity';
import { Student } from '../students/student.entity';
import { Room } from '../rooms/room.entity';
import { User } from '../users/user.entity';
import { SupportStatus } from '../common/enums/user-role.enum';

describe('SupportRequestsRepository', () => {
  let repository: SupportRequestsRepository;
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
    getMany: jest.fn(),
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
  };

  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn().mockReturnValue(mockManager),
    };

    repository = new SupportRequestsRepository(dataSource as any);
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
    it('should find a support request by id with relations', async () => {
      const mockRequest = {
        id: 1,
        studentId: 1,
        roomId: 1,
        category: 'Plumbing',
        title: 'Leaky faucet',
        description: 'The faucet in the bathroom is leaking',
        reply: null,
        status: SupportStatus.PENDING,
        handledBy: null,
        student: { id: 1, studentCode: 'S001' },
        room: { id: 1, roomNumber: '101' },
      };
      mockRepositoryMethods.findOne.mockResolvedValue(mockRequest);

      const result = await repository.findById(1);

      expect(mockRepositoryMethods.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: [
          'student',
          'student.user',
          'room',
          'room.building',
          'handler',
        ],
      });
      expect(result).toEqual(mockRequest);
    });

    it('should return null when request not found', async () => {
      mockRepositoryMethods.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByStudent', () => {
    it('should find support requests by student id', async () => {
      const mockRequests = [
        { id: 1, studentId: 1, roomId: 1, category: 'Plumbing', title: 'Leaky faucet', description: 'The faucet in the bathroom is leaking', status: SupportStatus.PENDING },
        { id: 2, studentId: 1, roomId: 2, category: 'Electrical', title: 'No power', description: 'No power in room', status: SupportStatus.PROCESSING },
      ];
      mockRepositoryMethods.find.mockResolvedValue(mockRequests);

      const result = await repository.findByStudent(1);

      expect(mockRepositoryMethods.find).toHaveBeenCalledWith({
        where: { studentId: 1 },
        relations: expect.any(Array),
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockRequests);
    });
  });

  describe('findByRoom', () => {
    it('should find support requests by room id', async () => {
      const mockRequests = [
        { id: 1, studentId: 1, roomId: 1, category: 'Plumbing', title: 'Leaky faucet', description: 'The faucet in the bathroom is leaking', status: SupportStatus.PENDING },
        { id: 2, studentId: 2, roomId: 1, category: 'Cleaning', title: 'Dirty bathroom', description: 'Bathroom needs cleaning', status: SupportStatus.PENDING },
      ];
      mockRepositoryMethods.find.mockResolvedValue(mockRequests);

      const result = await repository.findByRoom(1);

      expect(mockRepositoryMethods.find).toHaveBeenCalledWith({
        where: { roomId: 1 },
        relations: expect.any(Array),
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockRequests);
    });
  });

  describe('findByBuilding', () => {
    it('should find support requests by building id using query builder', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await repository.findByBuilding(1);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledTimes(5);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'building.id = :buildingId',
        { buildingId: 1 },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'support_request.createdAt',
        'DESC',
      );
    });
  });

  describe('findPending', () => {
    it('should find pending support requests', async () => {
      const mockRequests = [
        { id: 1, status: SupportStatus.PENDING },
        { id: 2, status: SupportStatus.PENDING },
      ];
      mockRepositoryMethods.find.mockResolvedValue(mockRequests);

      const result = await repository.findPending();

      expect(mockRepositoryMethods.find).toHaveBeenCalledWith({
        where: { status: SupportStatus.PENDING },
        relations: expect.any(Array),
        order: { createdAt: 'ASC' },
      });
      expect(result).toEqual(mockRequests);
    });
  });

  describe('findProcessing', () => {
    it('should find processing support requests', async () => {
      const mockRequests = [
        { id: 1, status: SupportStatus.PROCESSING },
        { id: 2, status: SupportStatus.PROCESSING },
      ];
      mockRepositoryMethods.find.mockResolvedValue(mockRequests);

      const result = await repository.findProcessing();

      expect(mockRepositoryMethods.find).toHaveBeenCalledWith({
        where: { status: SupportStatus.PROCESSING },
        relations: expect.any(Array),
        order: { createdAt: 'ASC' },
      });
      expect(result).toEqual(mockRequests);
    });
  });

  describe('findDone', () => {
    it('should find done support requests', async () => {
      const mockRequests = [
        { id: 1, status: SupportStatus.DONE },
        { id: 2, status: SupportStatus.DONE },
      ];
      mockRepositoryMethods.find.mockResolvedValue(mockRequests);

      const result = await repository.findDone();

      expect(mockRepositoryMethods.find).toHaveBeenCalledWith({
        where: { status: SupportStatus.DONE },
        relations: expect.any(Array),
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockRequests);
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

  describe('studentHasAccess', () => {
    it('should return true when student has access', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 1 }]);

      const result = await repository.studentHasAccess(1, 3);

      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT EXISTS'),
        [1, 3],
      );
      expect(result).toBe(true);
    });

    it('should return false when student has no access', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 0 }]);

      const result = await repository.studentHasAccess(1, 999);

      expect(result).toBe(false);
    });
  });
});