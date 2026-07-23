import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupportRequestsService } from './support-requests.service';
import { SupportRequestsRepository } from './support-requests.repository';
import { UserRole } from '../users/user.entity';
import { SupportStatus, ContractStatus } from '../common/enums/user-role.enum';
import { Student } from '../students/student.entity';
import { Room } from '../rooms/room.entity';
import { Contract } from '../contracts/contract.entity';

describe('SupportRequestsService', () => {
  let service: SupportRequestsService;
  let supportRequestsRepository: any;
  let dataSource: any;

  const mockUser = (userId: number, role: UserRole) => ({
    userId,
    role,
  });

  const mockStudent = {
    id: 1,
    userId: 3,
    studentCode: 'S001',
    gender: 'Male',
    user: { id: 3, fullName: 'Student One' },
  };

  const mockRoom = {
    id: 1,
    roomNumber: '101',
    building: {
      id: 1,
      buildingName: 'Building A',
      manager: { id: 2 },
    },
  };

  const mockContract = {
    id: 1,
    studentId: 1,
    roomId: 1,
    status: 'ACTIVE',
  };

  const mockSupportRequest = {
    id: 1,
    studentId: 1,
    roomId: 1,
    category: 'Plumbing',
    title: 'Leaky faucet',
    description: 'The faucet in the bathroom is leaking',
    reply: null,
    status: SupportStatus.PENDING,
    handledBy: null,
    student: mockStudent,
    room: mockRoom,
    handler: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryBuilder = () => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockSupportRequest], 1]),
      getOne: jest.fn().mockResolvedValue(mockSupportRequest),
      distinct: jest.fn().mockReturnThis(),
    };
    return qb;
  };

  const createServiceWithMocks = (repoMockOverrides?: Record<string, any>) => {
    const qb = mockQueryBuilder();
    const qbInstance = {
      ...qb,
      getManyAndCount: jest.fn().mockResolvedValue([[mockSupportRequest], 1]),
    };

    const repo = {
      createQueryBuilder: jest.fn().mockReturnValue(qbInstance),
      findById: jest.fn().mockResolvedValue(mockSupportRequest),
      findByStudent: jest.fn().mockResolvedValue([mockSupportRequest]),
      findByRoom: jest.fn().mockResolvedValue([mockSupportRequest]),
      findByBuilding: jest.fn().mockResolvedValue([mockSupportRequest]),
      findPending: jest.fn().mockResolvedValue([mockSupportRequest]),
      findProcessing: jest.fn().mockResolvedValue([mockSupportRequest]),
      findDone: jest.fn().mockResolvedValue([mockSupportRequest]),
      managerHasBuildingAccess: jest.fn().mockResolvedValue(true),
      studentHasAccess: jest.fn().mockResolvedValue(true),
      manager: {
        transaction: jest.fn(async (callback: any) => {
          const transactionalEntityManager = {
            getRepository: jest.fn().mockReturnValue({
              create: jest.fn((data: any) => data),
              save: jest.fn(async (data: any) => ({
                ...data,
                id: data.id ?? 1,
              })),
              findOne: jest.fn().mockResolvedValue(mockSupportRequest),
              delete: jest.fn(),
            }),
          };
          return callback(transactionalEntityManager);
        }),
      },
      ...(repoMockOverrides || {}),
    };

    const ds = {
      manager: {
        findOne: jest.fn((entity: any, options?: any) => {
          if (entity.name === 'Student') return Promise.resolve(mockStudent);
          if (entity.name === 'Room') return Promise.resolve(mockRoom);
          if (entity.name === 'Contract') {
            const where = options?.where;
            if (
              where?.studentId === mockContract.studentId &&
              where?.roomId === mockContract.roomId
            ) {
              if (
                where?.status === 'ACTIVE' ||
                where?.status === ContractStatus.ACTIVE
              ) {
                return Promise.resolve(mockContract);
              }
              return Promise.resolve(null);
            }
          }
          return Promise.resolve(null);
        }),
      },
      transaction: jest.fn(async (callback: any) => {
        let savedEntity: any = null;
        const transactionalEntityManager = {
          getRepository: jest.fn().mockReturnValue({
            create: jest.fn((data: any) => data),
            save: jest.fn(async (data: any) => {
              savedEntity = { ...data, id: data.id ?? 1 };
              return savedEntity;
            }),
            findOne: jest.fn(
              async (_options: any) => savedEntity || mockSupportRequest,
            ),
            delete: jest.fn(),
          }),
        };
        return callback(transactionalEntityManager);
      }),
    };

    const svc = new SupportRequestsService(repo as any, ds as any);
    return { service: svc, repo, dataSource: ds };
  };

  // ─── FIND ALL ────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('should return paginated support requests for ADMIN', async () => {
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
      expect(result.data[0].title).toBe('Leaky faucet');
    });

    it('should scope results for STUDENT role', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({}, mockUser(7, UserRole.STUDENT));

      expect(qb.andWhere).toHaveBeenCalledWith(
        'support_request.studentId = :studentId',
        {
          studentId: 1,
        },
      );
    });

    it('should scope results for MANAGER role', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({}, mockUser(2, UserRole.MANAGER));

      expect(qb.andWhere).toHaveBeenCalledWith(
        'building.manager_id = :managerId',
        { managerId: 2 },
      );
    });

    it('should apply search query', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ search: 'leaky' }, mockUser(1, UserRole.ADMIN));

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        expect.any(Object),
      );
    });

    it('should apply category filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { category: 'Plumbing' },
        mockUser(1, UserRole.ADMIN),
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'support_request.category = :category',
        {
          category: 'Plumbing',
        },
      );
    });

    it('should apply status filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { status: SupportStatus.PENDING },
        mockUser(1, UserRole.ADMIN),
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'support_request.status = :status',
        {
          status: SupportStatus.PENDING,
        },
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
        { search: 'NONEXISTENT' },
        mockUser(1, UserRole.ADMIN),
      );

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  // ─── FIND ONE ────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('should find a support request by id for ADMIN', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockSupportRequest);

      const result = await service.findOne(1, mockUser(1, UserRole.ADMIN));

      expect(result).toBeDefined();
      expect(result.title).toBe('Leaky faucet');
    });

    it('should throw NotFoundException when support request not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.findOne(999, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow STUDENT to access their own request', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockSupportRequest);
      repo.studentHasAccess.mockResolvedValue(true);

      const result = await service.findOne(1, mockUser(3, UserRole.STUDENT));

      expect(result).toBeDefined();
    });

    it('should reject STUDENT accessing another request', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockSupportRequest);
      repo.studentHasAccess.mockResolvedValue(false);

      await expect(
        service.findOne(1, mockUser(7, UserRole.STUDENT)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow MANAGER with access to view request', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockSupportRequest);
      repo.managerHasBuildingAccess.mockResolvedValue(true);

      const result = await service.findOne(1, mockUser(2, UserRole.MANAGER));

      expect(result).toBeDefined();
    });

    it('should reject MANAGER without access', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockSupportRequest);
      repo.managerHasBuildingAccess.mockResolvedValue(false);

      await expect(
        service.findOne(1, mockUser(2, UserRole.MANAGER)),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── CREATE ──────────────────────────────────────────────────────────────
  describe('create', () => {
    it('should create a support request successfully', async () => {
      const { service, dataSource } = createServiceWithMocks();

      const result = await service.create(
        {
          studentId: 1,
          roomId: 1,
          category: 'Plumbing',
          title: 'Leaky faucet',
          description: 'The faucet in the bathroom is leaking',
        },
        mockUser(3, UserRole.STUDENT),
      );

      expect(result).toBeDefined();
      expect(result.title).toBe('Leaky faucet');
      expect(result.status).toBe(SupportStatus.PENDING);
    });

    it('should reject if student not found', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.create(
          {
            studentId: 999,
            roomId: 1,
            category: 'Plumbing',
            title: 'Leaky faucet',
            description: 'The faucet in the bathroom is leaking',
          },
          mockUser(3, UserRole.STUDENT),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if room not found', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            studentId: 1,
            roomId: 999,
            category: 'Plumbing',
            title: 'Leaky faucet',
            description: 'The faucet in the bathroom is leaking',
          },
          mockUser(3, UserRole.STUDENT),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if no active contract for student in room', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any, options?: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        if (entity.name === 'Contract') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            studentId: 1,
            roomId: 1,
            category: 'Plumbing',
            title: 'Leaky faucet',
            description: 'The faucet in the bathroom is leaking',
          },
          mockUser(3, UserRole.STUDENT),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if contract is not active', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any, options?: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        if (entity.name === 'Contract') {
          if (options?.where?.status === ContractStatus.ACTIVE) {
            return Promise.resolve(null);
          }
          return Promise.resolve({ ...mockContract, status: 'INACTIVE' });
        }
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            studentId: 1,
            roomId: 1,
            category: 'Plumbing',
            title: 'Leaky faucet',
            description: 'The faucet in the bathroom is leaking',
          },
          mockUser(3, UserRole.STUDENT),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if category is empty', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        if (entity.name === 'Contract') return Promise.resolve(mockContract);
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            studentId: 1,
            roomId: 1,
            category: '',
            title: 'Leaky faucet',
            description: 'The faucet in the bathroom is leaking',
          },
          mockUser(3, UserRole.STUDENT),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if title is empty', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        if (entity.name === 'Contract') return Promise.resolve(mockContract);
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            studentId: 1,
            roomId: 1,
            category: 'Plumbing',
            title: '',
            description: 'The faucet in the bathroom is leaking',
          },
          mockUser(3, UserRole.STUDENT),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if description is empty', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        if (entity.name === 'Contract') return Promise.resolve(mockContract);
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            studentId: 1,
            roomId: 1,
            category: 'Plumbing',
            title: 'Leaky faucet',
            description: '',
          },
          mockUser(3, UserRole.STUDENT),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if status is not PENDING when provided', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        if (entity.name === 'Contract') return Promise.resolve(mockContract);
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            studentId: 1,
            roomId: 1,
            category: 'Plumbing',
            title: 'Leaky faucet',
            description: 'The faucet in the bathroom is leaking',
            status: SupportStatus.PROCESSING,
          },
          mockUser(3, UserRole.STUDENT),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow only students to create requests', async () => {
      const { service } = createServiceWithMocks();

      await expect(
        service.create(
          {
            studentId: 1,
            roomId: 1,
            category: 'Plumbing',
            title: 'Leaky faucet',
            description: 'The faucet in the bathroom is leaking',
          },
          mockUser(2, UserRole.MANAGER),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should use transaction for creation', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        if (entity.name === 'Contract') return Promise.resolve(mockContract);
        return Promise.resolve(null);
      });

      await service.create(
        {
          studentId: 1,
          roomId: 1,
          category: 'Plumbing',
          title: 'Leaky faucet',
          description: 'The faucet in the bathroom is leaking',
        },
        mockUser(3, UserRole.STUDENT),
      );

      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  // ─── UPDATE ──────────────────────────────────────────────────────────────
  describe('update', () => {
    it('should update a support request successfully', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        id: 1,
        studentId: 1,
        roomId: 1,
        category: 'Plumbing',
        title: 'Leaky faucet',
        description: 'The faucet in the bathroom is leaking',
        reply: null,
        status: SupportStatus.PENDING,
        handledBy: null,
        student: mockStudent,
        room: mockRoom,
        handler: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update(
        1,
        { reply: 'Fixed the faucet', status: SupportStatus.DONE },
        mockUser(2, UserRole.MANAGER),
      );

      expect(result).toBeDefined();
      expect(result.reply).toBe('Fixed the faucet');
      expect(result.status).toBe(SupportStatus.DONE);
    });

    it('should throw NotFoundException when support request not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.update(999, { reply: 'Fixed' }, mockUser(2, UserRole.MANAGER)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject updating DONE request', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...mockSupportRequest,
        status: SupportStatus.DONE,
      });

      await expect(
        service.update(
          1,
          { reply: 'Trying again' },
          mockUser(2, UserRole.MANAGER),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject updating with invalid status', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        id: 1,
        studentId: 1,
        roomId: 1,
        category: 'Plumbing',
        title: 'Leaky faucet',
        description: 'The faucet in the bathroom is leaking',
        reply: null,
        status: SupportStatus.PENDING,
        handledBy: null,
        student: mockStudent,
        room: mockRoom,
        handler: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.update(
          1,
          { status: 'INVALID' as any },
          mockUser(2, UserRole.MANAGER),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject MANAGER without access', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        id: 1,
        studentId: 1,
        roomId: 1,
        category: 'Plumbing',
        title: 'Leaky faucet',
        description: 'The faucet in the bathroom is leaking',
        reply: null,
        status: SupportStatus.PENDING,
        handledBy: null,
        student: mockStudent,
        room: mockRoom,
        handler: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repo.managerHasBuildingAccess.mockResolvedValue(false);

      await expect(
        service.update(1, { reply: 'Fixed' }, mockUser(2, UserRole.MANAGER)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow ADMIN to update any request', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        id: 1,
        studentId: 1,
        roomId: 1,
        category: 'Plumbing',
        title: 'Leaky faucet',
        description: 'The faucet in the bathroom is leaking',
        reply: null,
        status: SupportStatus.PENDING,
        handledBy: null,
        student: mockStudent,
        room: mockRoom,
        handler: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update(
        1,
        { reply: 'Fixed by admin', status: SupportStatus.DONE },
        mockUser(1, UserRole.ADMIN),
      );

      expect(result).toBeDefined();
      expect(result.reply).toBe('Fixed by admin');
    });

    it('should use transaction for update', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        if (entity.name === 'Contract') return Promise.resolve(mockContract);
        return Promise.resolve(null);
      });
      repo.findById.mockResolvedValue({
        id: 1,
        studentId: 1,
        roomId: 1,
        category: 'Plumbing',
        title: 'Leaky faucet',
        description: 'The faucet in the bathroom is leaking',
        reply: null,
        status: SupportStatus.PENDING,
        handledBy: null,
        student: mockStudent,
        room: mockRoom,
        handler: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.update(
        1,
        { reply: 'Fixed', status: SupportStatus.DONE },
        mockUser(2, UserRole.MANAGER),
      );

      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  // ─── REMOVE ──────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('should delete a support request successfully', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockSupportRequest);

      const result = await service.remove(1, mockUser(1, UserRole.ADMIN));

      expect(result).toEqual({
        message: 'Support request deleted successfully',
      });
    });

    it('should throw NotFoundException when support request not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.remove(999, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject deleting DONE request', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...mockSupportRequest,
        status: SupportStatus.DONE,
      });

      await expect(
        service.remove(1, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject MANAGER without access', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockSupportRequest);
      repo.managerHasBuildingAccess.mockResolvedValue(false);

      await expect(
        service.remove(1, mockUser(2, UserRole.MANAGER)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should use transaction for delete', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        if (entity.name === 'Contract') return Promise.resolve(mockContract);
        return Promise.resolve(null);
      });
      repo.findById.mockResolvedValue({
        id: 1,
        studentId: 1,
        roomId: 1,
        category: 'Plumbing',
        title: 'Leaky faucet',
        description: 'The faucet in the bathroom is leaking',
        reply: null,
        status: SupportStatus.PENDING,
        handledBy: null,
        student: mockStudent,
        room: mockRoom,
        handler: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.remove(1, mockUser(1, UserRole.ADMIN));

      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });
});
