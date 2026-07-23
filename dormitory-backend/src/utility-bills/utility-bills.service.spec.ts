import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UtilityBillsService } from './utility-bills.service';
import { UtilityBillsRepository } from './utility-bills.repository';
import { UserRole } from '../users/user.entity';
import { UtilityBillStatus } from '../common/enums/user-role.enum';

describe('UtilityBillsService', () => {
  let service: UtilityBillsService;
  let utilityBillsRepository: any;
  let dataSource: any;

  const mockUser = (userId: number, role: UserRole) => ({
    userId,
    role,
  });

  const mockRoom = {
    id: 1,
    roomNumber: 'A101',
    capacity: 4,
    building: {
      id: 1,
      buildingName: 'Tòa A',
      manager: { id: 2 },
    },
  };

  const mockCreator = {
    id: 1,
    fullName: 'Admin',
    role: UserRole.ADMIN,
  };

  const mockBill = {
    id: 1,
    roomId: 1,
    month: 7,
    year: 2026,
    electricOld: 1000,
    electricNew: 1050,
    waterOld: 500,
    waterNew: 510,
    electricFee: 175000,
    waterFee: 50000,
    status: UtilityBillStatus.DRAFT,
    createdBy: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    room: { ...mockRoom },
    creator: mockCreator,
    payments: [],
  };

  const mockQueryBuilder = () => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockBill], 1]),
      distinct: jest.fn().mockReturnThis(),
    };
    return qb;
  };

  const createMockBill = () => ({
    ...mockBill,
    room: { ...mockRoom, building: { ...mockRoom.building } },
    creator: { ...mockCreator },
    payments: [],
  });

  const createServiceWithMocks = (repoMockOverrides?: Record<string, any>) => {
    const freshMock = createMockBill();

    const createTransactionManager = () => ({
      getRepository: jest.fn((entity: any) => {
        if (entity.name === 'UtilityBill') {
          return {
            create: jest.fn((data: any) => data),
            save: jest.fn(async (data: any) => ({
              ...data,
              id: data.id ?? 1,
            })),
            findOne: jest.fn().mockResolvedValue(createMockBill()),
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
      findByRoomAndMonth: jest.fn(),
      managerHasBuildingAccess: jest.fn(),
      studentHasBillAccess: jest.fn(),
      findByRoomId: jest.fn(),
      getActiveUtilityBillsForRoom: jest.fn(),
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

    const svc = new UtilityBillsService(repo as any, ds as any);
    return { service: svc, repo, dataSource: ds };
  };

  // ─── FIND ALL ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated bills for ADMIN', async () => {
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
      expect(result.data[0].month).toBe(7);
    });

    it('should scope results for STUDENT role', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({}, mockUser(3, UserRole.STUDENT));

      expect(qb.innerJoin).toHaveBeenCalled();
      expect(qb.andWhere).toHaveBeenCalledWith('student.userId = :userId', {
        userId: 3,
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

      await service.findAll({ search: 'A101' }, mockUser(1, UserRole.ADMIN));

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

      await service.findAll({ status: 'DRAFT' }, mockUser(1, UserRole.ADMIN));

      expect(qb.andWhere).toHaveBeenCalledWith('bill.status = :status', {
        status: 'DRAFT',
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

    it('should apply month/year filters', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { month: 7, year: 2026 },
        mockUser(1, UserRole.ADMIN),
      );

      expect(qb.andWhere).toHaveBeenCalledWith('bill.month = :month', {
        month: 7,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('bill.year = :year', {
        year: 2026,
      });
    });

    it('should apply sorting', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { sortBy: 'month', sortOrder: 'DESC' },
        mockUser(1, UserRole.ADMIN),
      );

      expect(qb.orderBy).toHaveBeenCalledWith('bill.month', 'DESC');
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
    it('should find a bill by id for ADMIN', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockBill);

      const result = await service.findOne(1, mockUser(1, UserRole.ADMIN));

      expect(result).toBeDefined();
      expect(result.month).toBe(7);
    });

    it('should throw NotFoundException when bill not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.findOne(999, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow STUDENT with access to view bill', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockBill);
      repo.studentHasBillAccess.mockResolvedValue(true);

      const result = await service.findOne(1, mockUser(3, UserRole.STUDENT));

      expect(result).toBeDefined();
    });

    it('should reject STUDENT without access', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockBill);
      repo.studentHasBillAccess.mockResolvedValue(false);

      await expect(
        service.findOne(1, mockUser(7, UserRole.STUDENT)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow MANAGER with access to view bill', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockBill);
      repo.managerHasBuildingAccess.mockResolvedValue(true);

      const result = await service.findOne(1, mockUser(2, UserRole.MANAGER));

      expect(result).toBeDefined();
    });

    it('should reject MANAGER without access', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockBill);
      repo.managerHasBuildingAccess.mockResolvedValue(false);

      await expect(
        service.findOne(1, mockUser(2, UserRole.MANAGER)),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── CREATE ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a bill successfully', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        return Promise.resolve(null);
      });
      repo.findByRoomAndMonth.mockResolvedValue(null);

      const result = await service.create(
        {
          room_id: 1,
          month: 8,
          year: 2026,
          electric_old: 1050,
          electric_new: 1100,
          water_old: 510,
          water_new: 520,
        } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(result).toBeDefined();
      expect(result.month).toBe(7);
    });

    it('should reject create when room not found', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.create(
          {
            room_id: 999,
            month: 8,
            year: 2026,
            electric_old: 0,
            electric_new: 100,
            water_old: 0,
            water_new: 10,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject MANAGER creating in unmanaged building', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Room')
          return Promise.resolve({
            ...mockRoom,
            building: { ...mockRoom.building, manager: { id: 99 } },
          });
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            room_id: 1,
            month: 8,
            year: 2026,
            electric_old: 0,
            electric_new: 100,
            water_old: 0,
            water_new: 10,
          } as any,
          mockUser(2, UserRole.MANAGER),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject duplicate room/month/year', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        return Promise.resolve(null);
      });
      repo.findByRoomAndMonth.mockResolvedValue(mockBill);

      await expect(
        service.create(
          {
            room_id: 1,
            month: 7,
            year: 2026,
            electric_old: 0,
            electric_new: 100,
            water_old: 0,
            water_new: 10,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject electric_new < electric_old', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            room_id: 1,
            month: 8,
            year: 2026,
            electric_old: 100,
            electric_new: 50,
            water_old: 0,
            water_new: 10,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject water_new < water_old', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            room_id: 1,
            month: 8,
            year: 2026,
            electric_old: 0,
            electric_new: 100,
            water_old: 50,
            water_new: 10,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use transaction for creation', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Room') return Promise.resolve(mockRoom);
        return Promise.resolve(null);
      });
      repo.findByRoomAndMonth.mockResolvedValue(null);

      await service.create(
        {
          room_id: 1,
          month: 8,
          year: 2026,
          electric_old: 0,
          electric_new: 100,
          water_old: 0,
          water_new: 10,
        } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  // ─── UPDATE ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update a bill successfully', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockBill());
      repo.managerHasBuildingAccess.mockResolvedValue(true);

      const result = await service.update(
        1,
        { electric_fee: 200000 },
        mockUser(1, UserRole.ADMIN),
      );

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when bill not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.update(
          999,
          { electric_fee: 200000 } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject updating PUBLISHED bill', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...createMockBill(),
        status: UtilityBillStatus.PUBLISHED,
      });

      await expect(
        service.update(
          1,
          { electric_fee: 200000 } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when new room is not found during update', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockBill());
      repo.managerHasBuildingAccess.mockResolvedValue(true);
      dataSource.manager.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.update(1, { room_id: 999 } as any, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject MANAGER updating bill in unmanaged building', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockBill());
      repo.managerHasBuildingAccess.mockResolvedValue(true);
      dataSource.manager.findOne = jest.fn().mockResolvedValue({
        ...mockRoom,
        building: { ...mockRoom.building, manager: { id: 99 } },
      });

      await expect(
        service.update(1, { room_id: 2 } as any, mockUser(2, UserRole.MANAGER)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject duplicate room/month/year on update', async () => {
      const { service, repo } = createServiceWithMocks();
      const bill = createMockBill();
      repo.findById.mockResolvedValue(bill);
      repo.managerHasBuildingAccess.mockResolvedValue(true);
      repo.findByRoomAndMonth.mockResolvedValue({ id: 2 });

      await expect(
        service.update(
          1,
          { month: 8, year: 2026 } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject electric_new < electric_old on update', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockBill());
      repo.managerHasBuildingAccess.mockResolvedValue(true);

      await expect(
        service.update(
          1,
          { electric_old: 2000, electric_new: 1500 } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject water_new < water_old on update', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockBill());
      repo.managerHasBuildingAccess.mockResolvedValue(true);

      await expect(
        service.update(
          1,
          { water_old: 600, water_new: 500 } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when bill not found after update', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      const bill = createMockBill();
      repo.findById.mockResolvedValue(bill);
      repo.managerHasBuildingAccess.mockResolvedValue(true);
      dataSource.transaction = jest.fn(async (callback: any) =>
        callback({
          getRepository: jest.fn().mockReturnValue({
            save: jest.fn().mockResolvedValue(bill),
            findOne: jest.fn().mockResolvedValue(null),
          }),
        }),
      );

      await expect(
        service.update(
          1,
          { electric_fee: 200000 } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject MANAGER without access', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockBill());
      repo.managerHasBuildingAccess.mockResolvedValue(false);

      await expect(
        service.update(
          1,
          { electric_fee: 200000 } as any,
          mockUser(2, UserRole.MANAGER),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should use transaction for update', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockBill());
      repo.managerHasBuildingAccess.mockResolvedValue(true);

      await service.update(
        1,
        { electric_fee: 200000 } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  // ─── REMOVE ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete a bill successfully', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...createMockBill(),
        payments: [],
      });

      const result = await service.remove(1, mockUser(1, UserRole.ADMIN));

      expect(result).toEqual({
        message: 'Utility bill deleted successfully',
      });
    });

    it('should throw NotFoundException when bill not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.remove(999, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject MANAGER without access', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockBill());
      repo.managerHasBuildingAccess.mockResolvedValue(false);

      await expect(
        service.remove(1, mockUser(2, UserRole.MANAGER)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject deleting PUBLISHED bill with payments', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...createMockBill(),
        status: UtilityBillStatus.PUBLISHED,
        payments: [{ id: 1, invoiceCode: 'INV001' }],
      });

      await expect(
        service.remove(1, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(ConflictException);
    });

    it('should use transaction for delete', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...createMockBill(),
        payments: [],
      });

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
      repo.findById.mockResolvedValue(mockBill);

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

      expect(qb.andWhere).toHaveBeenCalledWith('student.userId = :userId', {
        userId: 3,
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
