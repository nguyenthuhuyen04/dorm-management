import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsRepository } from './contracts.repository';
import { UserRole } from '../users/user.entity';
import { ContractStatus } from '../common/enums/user-role.enum';

describe('ContractsService', () => {
  let service: ContractsService;
  let contractsRepository: any;
  let dataSource: any;

  const mockUser = (userId: number, role: UserRole) => ({
    userId,
    role,
  });

  const mockStudent = {
    id: 1,
    userId: 3,
    studentCode: 'SV001',
    gender: 'Female',
    user: { id: 3, fullName: 'Student One' },
  };

  const mockRoom = {
    id: 1,
    roomNumber: 'A101',
    capacity: 4,
    gender: 'Female',
    roomFee: 600000,
    building: {
      id: 1,
      buildingName: 'Tòa A',
      gender: 'Female',
      manager: { id: 2 },
    },
  };

  const mockCreator = {
    id: 1,
    fullName: 'Admin',
    role: UserRole.ADMIN,
  };

  const mockContract = {
    id: 1,
    contractCode: 'HD001',
    studentId: 1,
    roomId: 1,
    createdBy: 1,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    deposit: 500000,
    status: ContractStatus.ACTIVE,
    createdAt: new Date(),
    student: mockStudent,
    room: mockRoom,
    creator: mockCreator,
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
      getManyAndCount: jest.fn().mockResolvedValue([[mockContract], 1]),
      distinct: jest.fn().mockReturnThis(),
    };
    return qb;
  };

  const createMockContract = () => ({
    id: 1,
    contractCode: 'HD001',
    studentId: 1,
    roomId: 1,
    createdBy: 1,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    deposit: 500000,
    status: ContractStatus.ACTIVE,
    createdAt: new Date(),
    student: { ...mockStudent },
    room: { ...mockRoom, building: { ...mockRoom.building } },
    creator: { ...mockCreator },
  });

  const createServiceWithMocks = (repoMockOverrides?: Record<string, any>) => {
    const freshMock = createMockContract();

    const createTransactionManager = () => ({
      getRepository: jest.fn((entity: any) => {
        if (entity.name === 'Contract') {
          return {
            create: jest.fn((data: any) => data),
            save: jest.fn(async (data: any) => ({
              ...data,
              id: data.id ?? 1,
            })),
            findOne: jest.fn().mockResolvedValue(createMockContract()),
            delete: jest.fn(),
          };
        }
        return {
          findOne: jest.fn().mockResolvedValue(null),
          save: jest.fn(),
        };
      }),
      query: jest.fn(),
    });

    const qb = mockQueryBuilder();
    const qbInstance = {
      ...qb,
      getManyAndCount: jest.fn().mockResolvedValue([[freshMock], 1]),
    };

    const repo = {
      createQueryBuilder: jest.fn().mockReturnValue(qbInstance),
      findById: jest.fn().mockResolvedValue(freshMock),
      findByContractCode: jest.fn(),
      countActiveContractsByStudent: jest.fn(),
      countActiveContractsByRoom: jest.fn(),
      getActiveOccupancy: jest.fn(),
      hasActiveContractForStudent: jest.fn(),
      hasPaymentsForContract: jest.fn(),
      managerHasContractAccess: jest.fn(),
      manager: {
        transaction: jest.fn(async (callback: any) => {
          return callback(createTransactionManager());
        }),
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

    const svc = new ContractsService(repo as any, ds as any);
    return { service: svc, repo, dataSource: ds };
  };

  // ─── FIND ALL ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated contracts for ADMIN', async () => {
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
      expect(result.data[0].contractCode).toBe('HD001');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'contract.student',
        'student',
      );
    });

    it('should scope results for STUDENT role', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({}, mockUser(7, UserRole.STUDENT));

      expect(qb.andWhere).toHaveBeenCalledWith('student.userId = :userId', {
        userId: 7,
      });
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

      await service.findAll({ search: 'HD001' }, mockUser(1, UserRole.ADMIN));

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        expect.any(Object),
      );
    });

    it('should apply status filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ status: 'ACTIVE' }, mockUser(1, UserRole.ADMIN));

      expect(qb.andWhere).toHaveBeenCalledWith('contract.status = :status', {
        status: 'ACTIVE',
      });
    });

    it('should apply building filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ building: 'A' }, mockUser(1, UserRole.ADMIN));

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('building.buildingName'),
        expect.any(Object),
      );
    });

    it('should apply room filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ room: '101' }, mockUser(1, UserRole.ADMIN));

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('room.roomNumber'),
        expect.any(Object),
      );
    });

    it('should apply student filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ student: 'SV001' }, mockUser(1, UserRole.ADMIN));

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('student.studentCode'),
        expect.any(Object),
      );
    });

    it('should apply date range filters', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { start_date: '2024-01-01', end_date: '2024-12-31' },
        mockUser(1, UserRole.ADMIN),
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'contract.startDate >= :startDate',
        { startDate: '2024-01-01' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('contract.endDate <= :endDate', {
        endDate: '2024-12-31',
      });
    });

    it('should apply sorting', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { sortBy: 'startDate', sortOrder: 'DESC' },
        mockUser(1, UserRole.ADMIN),
      );

      expect(qb.orderBy).toHaveBeenCalledWith('contract.startDate', 'DESC');
    });

    it('should default to id sorting when invalid sortBy provided', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { sortBy: 'invalidField' as any, sortOrder: 'INVALID' as any },
        mockUser(1, UserRole.ADMIN),
      );

      expect(qb.orderBy).toHaveBeenCalledWith('contract.id', 'ASC');
    });

    it('should apply created_at filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { created_at: '2024-07-23' },
        mockUser(1, UserRole.ADMIN),
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'DATE(contract.createdAt) = :createdAt',
        { createdAt: '2024-07-23' },
      );
    });

    it('should apply manager filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ manager: 'Admin' }, mockUser(1, UserRole.ADMIN));

      expect(qb.andWhere).toHaveBeenCalledWith(
        'LOWER(creator.fullName) LIKE :manager',
        expect.any(Object),
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

    it('should default to page 1 and limit 10 for invalid values', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 0, limit: 0 }, mockUser(1, UserRole.ADMIN));

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(10);
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
    it('should find a contract by id for ADMIN', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockContract);

      const result = await service.findOne(1, mockUser(1, UserRole.ADMIN));

      expect(result).toBeDefined();
      expect(result.contractCode).toBe('HD001');
    });

    it('should throw NotFoundException when contract not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.findOne(999, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow STUDENT to access their own contract', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockContract);

      const result = await service.findOne(1, mockUser(3, UserRole.STUDENT));

      expect(result).toBeDefined();
    });

    it('should reject STUDENT accessing another contract', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...mockContract,
        student: { ...mockStudent, userId: 8 },
      });

      await expect(
        service.findOne(1, mockUser(7, UserRole.STUDENT)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow MANAGER with access to view contract', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockContract);
      repo.managerHasContractAccess.mockResolvedValue(true);

      const result = await service.findOne(1, mockUser(2, UserRole.MANAGER));

      expect(result).toBeDefined();
    });

    it('should reject MANAGER without access', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockContract);
      repo.managerHasContractAccess.mockResolvedValue(false);

      await expect(
        service.findOne(1, mockUser(2, UserRole.MANAGER)),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── CREATE ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a contract successfully', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        if (entity.name === 'User') return Promise.resolve(mockCreator);
        return Promise.resolve(null);
      });
      repo.findByContractCode.mockResolvedValue(null);
      repo.countActiveContractsByStudent.mockResolvedValue(0);
      repo.getActiveOccupancy.mockResolvedValue(1);

      const result = await service.create(
        {
          contract_code: 'HD100',
          student_id: 1,
          room_id: 1,
          start_date: new Date('2024-01-01') as any,
          end_date: new Date('2024-12-31') as any,
          deposit: 500000,
        } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(result).toBeDefined();
      expect(result.contractCode).toBe('HD001');
    });

    it('should reject create when student not found', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.create(
          {
            contract_code: 'HD100',
            student_id: 999,
            room_id: 1,
            start_date: new Date(),
            end_date: new Date(),
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject create when room not found', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            contract_code: 'HD100',
            student_id: 1,
            room_id: 999,
            start_date: new Date(),
            end_date: new Date(),
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject MANAGER creating in building they do not manage', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room')
          return Promise.resolve({
            ...mockRoom,
            building: { ...mockRoom.building, manager: { id: 99 } },
          });
        if (entity.name === 'User') return Promise.resolve(mockCreator);
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            contract_code: 'HD100',
            student_id: 1,
            room_id: 1,
            start_date: new Date(),
            end_date: new Date(),
          } as any,
          mockUser(2, UserRole.MANAGER),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject duplicate contract_code', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        if (entity.name === 'User') return Promise.resolve(mockCreator);
        return Promise.resolve(null);
      });
      repo.findByContractCode.mockResolvedValue(mockContract);

      await expect(
        service.create(
          {
            contract_code: 'HD001',
            student_id: 1,
            room_id: 1,
            start_date: new Date(),
            end_date: new Date(),
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject when student already has ACTIVE contract', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        if (entity.name === 'User') return Promise.resolve(mockCreator);
        return Promise.resolve(null);
      });
      repo.findByContractCode.mockResolvedValue(null);
      repo.countActiveContractsByStudent.mockResolvedValue(1);

      await expect(
        service.create(
          {
            contract_code: 'HD100',
            student_id: 1,
            room_id: 1,
            start_date: new Date(),
            end_date: new Date(),
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject when room is full', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room')
          return Promise.resolve({ ...mockRoom, capacity: 2 });
        if (entity.name === 'User') return Promise.resolve(mockCreator);
        return Promise.resolve(null);
      });
      repo.findByContractCode.mockResolvedValue(null);
      repo.countActiveContractsByStudent.mockResolvedValue(0);
      repo.getActiveOccupancy.mockResolvedValue(2);

      await expect(
        service.create(
          {
            contract_code: 'HD100',
            student_id: 1,
            room_id: 1,
            start_date: new Date(),
            end_date: new Date(),
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when room gender mismatches student gender', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student')
          return Promise.resolve({ ...mockStudent, gender: 'Male' });
        if (entity.name === 'Room')
          return Promise.resolve({ ...mockRoom, gender: 'Female' });
        if (entity.name === 'User') return Promise.resolve(mockCreator);
        return Promise.resolve(null);
      });
      repo.findByContractCode.mockResolvedValue(null);
      repo.countActiveContractsByStudent.mockResolvedValue(0);
      repo.getActiveOccupancy.mockResolvedValue(1);

      await expect(
        service.create(
          {
            contract_code: 'HD100',
            student_id: 1,
            room_id: 1,
            start_date: new Date(),
            end_date: new Date(),
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when start_date > end_date', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        if (entity.name === 'User') return Promise.resolve(mockCreator);
        return Promise.resolve(null);
      });
      repo.findByContractCode.mockResolvedValue(null);
      repo.countActiveContractsByStudent.mockResolvedValue(0);
      repo.getActiveOccupancy.mockResolvedValue(1);

      await expect(
        service.create(
          {
            contract_code: 'HD100',
            student_id: 1,
            room_id: 1,
            start_date: new Date('2024-12-31') as any,
            end_date: new Date('2024-01-01') as any,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject create when room has no building', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room')
          return Promise.resolve({ ...mockRoom, building: null } as any);
        if (entity.name === 'User') return Promise.resolve(mockCreator);
        return Promise.resolve(null);
      });
      repo.findByContractCode.mockResolvedValue(null);

      await expect(
        service.create(
          {
            contract_code: 'HD100',
            student_id: 1,
            room_id: 1,
            start_date: new Date(),
            end_date: new Date(),
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject create when creator not found', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        return Promise.resolve(null);
      });
      repo.findByContractCode.mockResolvedValue(null);
      repo.countActiveContractsByStudent.mockResolvedValue(0);
      repo.getActiveOccupancy.mockResolvedValue(0);

      await expect(
        service.create(
          {
            contract_code: 'HD100',
            student_id: 1,
            room_id: 1,
            start_date: new Date(),
            end_date: new Date(),
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if payment not found after creation', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        if (entity.name === 'User') return Promise.resolve(mockCreator);
        return Promise.resolve(null);
      });
      repo.findByContractCode.mockResolvedValue(null);
      repo.countActiveContractsByStudent.mockResolvedValue(0);
      repo.getActiveOccupancy.mockResolvedValue(1);
      dataSource.transaction = jest.fn(async (callback: any) =>
        callback({
          getRepository: jest.fn((entity: any) => ({
            create: jest.fn((data: any) => data),
            save: jest.fn(async (data: any) => ({ ...data, id: 1 })),
            findOne: jest.fn().mockResolvedValue(null),
          })),
        }),
      );

      await expect(
        service.create(
          {
            contract_code: 'HD100',
            student_id: 1,
            room_id: 1,
            start_date: new Date('2024-01-01') as any,
            end_date: new Date('2024-12-31') as any,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use transaction for creation', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        if (entity.name === 'User') return Promise.resolve(mockCreator);
        return Promise.resolve(null);
      });
      repo.findByContractCode.mockResolvedValue(null);
      repo.countActiveContractsByStudent.mockResolvedValue(0);
      repo.getActiveOccupancy.mockResolvedValue(1);

      await service.create(
        {
          contract_code: 'HD100',
          student_id: 1,
          room_id: 1,
          start_date: new Date('2024-01-01') as any,
          end_date: new Date('2024-12-31') as any,
        } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  // ─── UPDATE ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update a contract successfully', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockContract());
      repo.managerHasContractAccess.mockResolvedValue(true);

      const result = await service.update(
        1,
        { deposit: 600000 },
        mockUser(1, UserRole.ADMIN),
      );

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when contract not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.update(
          999,
          { deposit: 600000 } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject when room not found during update', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      const contract = createMockContract();
      repo.findById.mockResolvedValue(contract);
      dataSource.manager.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.update(1, { room_id: 999 } as any, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject MANAGER without access', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockContract());
      repo.managerHasContractAccess.mockResolvedValue(false);

      await expect(
        service.update(
          1,
          { deposit: 600000 } as any,
          mockUser(2, UserRole.MANAGER),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject invalid date range', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockContract());

      await expect(
        service.update(
          1,
          {
            start_date: new Date('2024-12-31') as any,
            end_date: new Date('2024-01-01') as any,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when new room is full', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      const contract = createMockContract();
      repo.findById.mockResolvedValue(contract);
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Room')
          return Promise.resolve({
            ...mockRoom,
            capacity: 1,
            building: mockRoom.building,
          });
        return Promise.resolve(null);
      });
      repo.getActiveOccupancy.mockResolvedValue(1);

      await expect(
        service.update(1, { room_id: 1 } as any, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use transaction for update', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockContract());
      repo.managerHasContractAccess.mockResolvedValue(true);

      await service.update(
        1,
        { deposit: 600000 } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  // ─── REMOVE ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete a contract successfully', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...mockContract,
        status: 'ACTIVE' as any,
      });
      repo.hasPaymentsForContract.mockResolvedValue(false);

      const result = await service.remove(1, mockUser(1, UserRole.ADMIN));

      expect(result).toEqual({ message: 'Contract deleted successfully' });
    });

    it('should throw NotFoundException when contract not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.remove(999, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject MANAGER without access', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockContract);
      repo.managerHasContractAccess.mockResolvedValue(false);

      await expect(
        service.remove(1, mockUser(2, UserRole.MANAGER)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject deleting ACTIVE contract with payments', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...mockContract,
        status: 'ACTIVE' as any,
      });
      repo.hasPaymentsForContract.mockResolvedValue(true);

      await expect(
        service.remove(1, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(ConflictException);
    });

    it('should use transaction for delete', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...mockContract,
        status: 'ACTIVE' as any,
      });
      repo.hasPaymentsForContract.mockResolvedValue(false);

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
      repo.findById.mockResolvedValue(mockContract);

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

      await service.findAll({}, mockUser(7, UserRole.STUDENT));

      expect(qb.andWhere).toHaveBeenCalledWith('student.userId = :userId', {
        userId: 7,
      });
    });

    it('should enforce MANAGER building scope', async () => {
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
  });
});
