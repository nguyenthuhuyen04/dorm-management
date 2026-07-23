import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { UserRole } from '../users/user.entity';
import { PaymentStatus } from '../common/enums/user-role.enum';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentsRepository: any;
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

  const mockContract = {
    id: 1,
    contractCode: 'HD001',
    studentId: 1,
    roomId: 1,
    createdBy: 1,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    deposit: 500000,
    status: 'ACTIVE',
    createdAt: new Date(),
    room: mockRoom,
  };

  const mockUtilityBill = {
    id: 1,
    roomId: 1,
    month: 7,
    year: 2026,
    room: { id: 1 },
  };

  const mockPayment = {
    id: 1,
    invoiceCode: 'INV001',
    studentId: 1,
    contractId: 1,
    utilityBillId: 1,
    month: 7,
    year: 2026,
    roomFee: 600000,
    electricFee: 175000,
    waterFee: 50000,
    otherFee: 0,
    totalAmount: 825000,
    dueDate: new Date('2026-07-20'),
    paymentDate: null,
    paymentMethod: null,
    status: PaymentStatus.UNPAID,
    createdAt: new Date(),
    updatedAt: new Date(),
    student: mockStudent,
    contract: mockContract,
    utilityBill: mockUtilityBill,
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
      getManyAndCount: jest.fn().mockResolvedValue([[mockPayment], 1]),
      distinct: jest.fn().mockReturnThis(),
    };
    return qb;
  };

  const createMockPayment = () => ({
    ...mockPayment,
    student: { ...mockStudent },
    contract: {
      ...mockContract,
      room: { ...mockRoom, building: { ...mockRoom.building } },
    },
    utilityBill: { ...mockUtilityBill },
  });

  const createServiceWithMocks = (repoMockOverrides?: Record<string, any>) => {
    const freshMock = createMockPayment();

    const createTransactionManager = () => ({
      getRepository: jest.fn((entity: any) => {
        if (entity.name === 'Payment') {
          return {
            create: jest.fn((data: any) => data),
            save: jest.fn(async (data: any) => ({ ...data, id: data.id ?? 1 })),
            findOne: jest.fn().mockResolvedValue(freshMock),
            delete: jest.fn(),
          };
        }
        return { findOne: jest.fn().mockResolvedValue(null), save: jest.fn() };
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
      findByInvoiceCode: jest.fn(),
      findByStudent: jest.fn(),
      findByContract: jest.fn(),
      findByUtilityBill: jest.fn(),
      findByRoom: jest.fn(),
      findByBuilding: jest.fn(),
      findByRoomAndMonth: jest.fn(),
      managerHasBuildingAccess: jest.fn(),
      studentHasPaymentAccess: jest.fn(),
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

    const svc = new PaymentsService(repo as any, ds as any);
    return { service: svc, repo, dataSource: ds };
  };

  // ─── FIND ALL ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated payments for ADMIN', async () => {
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
      expect(result.data[0].invoiceCode).toBe('INV001');
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

      await service.findAll({ search: 'INV001' }, mockUser(1, UserRole.ADMIN));

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        expect.any(Object),
      );
    });

    it('should apply month filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ month: 7 }, mockUser(1, UserRole.ADMIN));

      expect(qb.andWhere).toHaveBeenCalledWith('payment.month = :month', {
        month: 7,
      });
    });

    it('should apply year filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ year: 2026 }, mockUser(1, UserRole.ADMIN));

      expect(qb.andWhere).toHaveBeenCalledWith('payment.year = :year', {
        year: 2026,
      });
    });

    it('should apply status filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ status: 'UNPAID' }, mockUser(1, UserRole.ADMIN));

      expect(qb.andWhere).toHaveBeenCalledWith('payment.status = :status', {
        status: 'UNPAID',
      });
    });

    it('should apply payment method filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { payment_method: 'CASH' },
        mockUser(1, UserRole.ADMIN),
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'payment.paymentMethod = :paymentMethod',
        { paymentMethod: 'CASH' },
      );
    });

    it('should apply student_id and room_id filters', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { student_id: 1, room_id: 2 },
        mockUser(1, UserRole.ADMIN),
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'payment.studentId = :studentId',
        {
          studentId: 1,
        },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('contract.roomId = :roomId', {
        roomId: 2,
      });
    });

    it('should default to id sort when invalid sortBy provided', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { sortBy: 'invalidField', sortOrder: 'DESC' },
        mockUser(1, UserRole.ADMIN),
      );

      expect(qb.orderBy).toHaveBeenCalledWith('payment.id', 'DESC');
    });

    it('should apply a valid sortBy field', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { sortBy: 'month', sortOrder: 'DESC' },
        mockUser(1, UserRole.ADMIN),
      );

      expect(qb.orderBy).toHaveBeenCalledWith('payment.month', 'DESC');
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
    it('should find a payment by id for ADMIN', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockPayment);

      const result = await service.findOne(1, mockUser(1, UserRole.ADMIN));

      expect(result).toBeDefined();
      expect(result.invoiceCode).toBe('INV001');
    });

    it('should throw NotFoundException when payment not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.findOne(999, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow STUDENT to access their own payment', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockPayment);
      repo.studentHasPaymentAccess.mockResolvedValue(true);

      const result = await service.findOne(1, mockUser(3, UserRole.STUDENT));

      expect(result).toBeDefined();
    });

    it('should reject STUDENT accessing another payment', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockPayment);
      repo.studentHasPaymentAccess.mockResolvedValue(false);

      await expect(
        service.findOne(1, mockUser(7, UserRole.STUDENT)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow MANAGER with access to view payment', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockPayment);
      repo.managerHasBuildingAccess.mockResolvedValue(true);

      const result = await service.findOne(1, mockUser(2, UserRole.MANAGER));

      expect(result).toBeDefined();
    });

    it('should reject MANAGER without access', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockPayment);
      repo.managerHasBuildingAccess.mockResolvedValue(false);

      await expect(
        service.findOne(1, mockUser(2, UserRole.MANAGER)),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── CREATE ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a payment successfully', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Contract') return Promise.resolve(mockContract);
        if (entity.name === 'UtilityBill')
          return Promise.resolve(mockUtilityBill);
        return Promise.resolve(null);
      });
      repo.findByInvoiceCode.mockResolvedValue(null);

      const result = await service.create(
        {
          invoice_code: 'INV100',
          student_id: 1,
          contract_id: 1,
          utility_bill_id: 1,
          month: 7,
          year: 2026,
          room_fee: 600000,
          electric_fee: 175000,
          water_fee: 50000,
          other_fee: 0,
          total_amount: 825000,
          due_date: new Date('2026-07-20') as any,
        } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(result).toBeDefined();
      expect(result.invoiceCode).toBe('INV001');
    });

    it('should reject if student not found', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.create(
          {
            invoice_code: 'INV100',
            student_id: 999,
            contract_id: 1,
            utility_bill_id: 1,
            month: 7,
            year: 2026,
            room_fee: 600000,
            electric_fee: 0,
            water_fee: 0,
            other_fee: 0,
            total_amount: 600000,
            due_date: new Date() as any,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if contract not found', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            invoice_code: 'INV100',
            student_id: 1,
            contract_id: 999,
            utility_bill_id: 1,
            month: 7,
            year: 2026,
            room_fee: 600000,
            electric_fee: 0,
            water_fee: 0,
            other_fee: 0,
            total_amount: 600000,
            due_date: new Date() as any,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if utility bill not found', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Contract') return Promise.resolve(mockContract);
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            invoice_code: 'INV100',
            student_id: 1,
            contract_id: 1,
            utility_bill_id: 999,
            month: 7,
            year: 2026,
            room_fee: 600000,
            electric_fee: 0,
            water_fee: 0,
            other_fee: 0,
            total_amount: 600000,
            due_date: new Date() as any,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if contract does not belong to student', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Contract')
          return Promise.resolve({ ...mockContract, studentId: 999 });
        if (entity.name === 'UtilityBill')
          return Promise.resolve(mockUtilityBill);
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            invoice_code: 'INV100',
            student_id: 1,
            contract_id: 1,
            utility_bill_id: 1,
            month: 7,
            year: 2026,
            room_fee: 600000,
            electric_fee: 0,
            water_fee: 0,
            other_fee: 0,
            total_amount: 600000,
            due_date: new Date() as any,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate invoice_code', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Contract') return Promise.resolve(mockContract);
        if (entity.name === 'UtilityBill')
          return Promise.resolve(mockUtilityBill);
        return Promise.resolve(null);
      });
      repo.findByInvoiceCode.mockResolvedValue(mockPayment);

      await expect(
        service.create(
          {
            invoice_code: 'INV001',
            student_id: 1,
            contract_id: 1,
            utility_bill_id: 1,
            month: 7,
            year: 2026,
            room_fee: 600000,
            electric_fee: 0,
            water_fee: 0,
            other_fee: 0,
            total_amount: 600000,
            due_date: new Date() as any,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject when month is invalid', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Contract') return Promise.resolve(mockContract);
        if (entity.name === 'UtilityBill')
          return Promise.resolve(mockUtilityBill);
        return Promise.resolve(null);
      });
      repo.findByInvoiceCode.mockResolvedValue(null);

      await expect(
        service.create(
          {
            invoice_code: 'INV100',
            student_id: 1,
            contract_id: 1,
            utility_bill_id: 1,
            month: 13,
            year: 2026,
            room_fee: 600000,
            electric_fee: 0,
            water_fee: 0,
            other_fee: 0,
            total_amount: 600000,
            due_date: new Date() as any,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when year is invalid', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Contract') return Promise.resolve(mockContract);
        if (entity.name === 'UtilityBill')
          return Promise.resolve(mockUtilityBill);
        return Promise.resolve(null);
      });
      repo.findByInvoiceCode.mockResolvedValue(null);

      await expect(
        service.create(
          {
            invoice_code: 'INV100',
            student_id: 1,
            contract_id: 1,
            utility_bill_id: 1,
            month: 7,
            year: 1999,
            room_fee: 600000,
            electric_fee: 0,
            water_fee: 0,
            other_fee: 0,
            total_amount: 600000,
            due_date: new Date() as any,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when invoice is created by manager in another building', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Contract')
          return Promise.resolve({
            ...mockContract,
            room: {
              ...mockRoom,
              building: { ...mockRoom.building, manager: { id: 99 } },
            },
          });
        if (entity.name === 'UtilityBill')
          return Promise.resolve(mockUtilityBill);
        return Promise.resolve(null);
      });
      await expect(
        service.create(
          {
            invoice_code: 'INV100',
            student_id: 1,
            contract_id: 1,
            utility_bill_id: 1,
            month: 7,
            year: 2026,
            room_fee: 600000,
            electric_fee: 175000,
            water_fee: 50000,
            other_fee: 0,
            total_amount: 825000,
            due_date: new Date() as any,
          } as any,
          mockUser(2, UserRole.MANAGER),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject when contract does not belong to student', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Contract')
          return Promise.resolve({ ...mockContract, studentId: 999 });
        if (entity.name === 'UtilityBill')
          return Promise.resolve(mockUtilityBill);
        return Promise.resolve(null);
      });
      repo.findByInvoiceCode.mockResolvedValue(null);

      await expect(
        service.create(
          {
            invoice_code: 'INV100',
            student_id: 1,
            contract_id: 1,
            utility_bill_id: 1,
            month: 7,
            year: 2026,
            room_fee: 600000,
            electric_fee: 175000,
            water_fee: 50000,
            other_fee: 0,
            total_amount: 825000,
            due_date: new Date() as any,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when utility bill room mismatches contract room', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Contract') return Promise.resolve(mockContract);
        if (entity.name === 'UtilityBill')
          return Promise.resolve({ ...mockUtilityBill, roomId: 999 });
        return Promise.resolve(null);
      });
      repo.findByInvoiceCode.mockResolvedValue(null);

      await expect(
        service.create(
          {
            invoice_code: 'INV100',
            student_id: 1,
            contract_id: 1,
            utility_bill_id: 1,
            month: 7,
            year: 2026,
            room_fee: 600000,
            electric_fee: 175000,
            water_fee: 50000,
            other_fee: 0,
            total_amount: 825000,
            due_date: new Date() as any,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject MANAGER creating in building they do not manage', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Contract')
          return Promise.resolve({
            ...mockContract,
            room: {
              ...mockRoom,
              building: { ...mockRoom.building, manager: { id: 99 } },
            },
          });
        if (entity.name === 'UtilityBill')
          return Promise.resolve(mockUtilityBill);
        return Promise.resolve(null);
      });

      await expect(
        service.create(
          {
            invoice_code: 'INV100',
            student_id: 1,
            contract_id: 1,
            utility_bill_id: 1,
            month: 7,
            year: 2026,
            room_fee: 600000,
            electric_fee: 0,
            water_fee: 0,
            other_fee: 0,
            total_amount: 600000,
            due_date: new Date() as any,
          } as any,
          mockUser(2, UserRole.MANAGER),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create a payment successfully as MANAGER with default payment date and missing optional fees', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      const managerContract = {
        ...mockContract,
        room: {
          ...mockRoom,
          building: { ...mockRoom.building, manager: { id: 2 } },
        },
      };

      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Contract') return Promise.resolve(managerContract);
        if (entity.name === 'UtilityBill')
          return Promise.resolve(mockUtilityBill);
        return Promise.resolve(null);
      });
      repo.findByInvoiceCode.mockResolvedValue(null);
      dataSource.transaction = jest.fn(async (callback: any) =>
        callback({
          getRepository: jest.fn(() => ({
            create: jest.fn((data: any) => data),
            save: jest.fn(async (data: any) => ({ ...data, id: 2 })),
            findOne: jest.fn(async () => ({
              ...mockPayment,
              id: 2,
              status: PaymentStatus.PAID,
              paymentDate: new Date(),
              roomFee: 600000,
              electricFee: 0,
              waterFee: 0,
              otherFee: 0,
              totalAmount: 600000,
              student: mockStudent,
              contract: managerContract,
              utilityBill: mockUtilityBill,
            })),
          })),
        }),
      );

      const result = await service.create(
        {
          invoice_code: 'INV100',
          student_id: 1,
          contract_id: 1,
          utility_bill_id: 1,
          month: 7,
          year: 2026,
          room_fee: 600000,
          total_amount: 600000,
          due_date: new Date('2026-07-20') as any,
          status: PaymentStatus.PAID,
        } as any,
        mockUser(2, UserRole.MANAGER),
      );

      expect(result.status).toBe(PaymentStatus.PAID);
      expect(result.paymentDate).not.toBeNull();
      expect(result.utilityBillId).toBe(1);
    });

    it('should reject when total_amount does not match fee calculation on create', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Contract') return Promise.resolve(mockContract);
        if (entity.name === 'UtilityBill')
          return Promise.resolve(mockUtilityBill);
        return Promise.resolve(null);
      });
      repo.findByInvoiceCode.mockResolvedValue(null);

      await expect(
        service.create(
          {
            invoice_code: 'INV100',
            student_id: 1,
            contract_id: 1,
            utility_bill_id: 1,
            month: 7,
            year: 2026,
            room_fee: 600000,
            electric_fee: 0,
            water_fee: 0,
            other_fee: 0,
            total_amount: 600001,
            due_date: new Date('2026-07-20') as any,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when created payment is not found after creation', async () => {
      const { service, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Contract') return Promise.resolve(mockContract);
        if (entity.name === 'UtilityBill')
          return Promise.resolve(mockUtilityBill);
        return Promise.resolve(null);
      });
      dataSource.transaction = jest.fn(async (callback: any) =>
        callback({
          getRepository: jest.fn(() => ({
            create: jest.fn((data: any) => data),
            save: jest.fn(async (data: any) => ({ ...data, id: 2 })),
            findOne: jest.fn(async () => null),
          })),
        }),
      );

      await expect(
        service.create(
          {
            invoice_code: 'INV100',
            student_id: 1,
            contract_id: 1,
            utility_bill_id: 1,
            month: 7,
            year: 2026,
            room_fee: 600000,
            electric_fee: 0,
            water_fee: 0,
            other_fee: 0,
            total_amount: 600000,
            due_date: new Date('2026-07-20') as any,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use transaction for creation', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Student') return Promise.resolve(mockStudent);
        if (entity.name === 'Contract') return Promise.resolve(mockContract);
        if (entity.name === 'UtilityBill')
          return Promise.resolve(mockUtilityBill);
        return Promise.resolve(null);
      });
      repo.findByInvoiceCode.mockResolvedValue(null);

      await service.create(
        {
          invoice_code: 'INV100',
          student_id: 1,
          contract_id: 1,
          utility_bill_id: 1,
          month: 7,
          year: 2026,
          room_fee: 600000,
          electric_fee: 0,
          water_fee: 0,
          other_fee: 0,
          total_amount: 600000,
          due_date: new Date('2026-07-20') as any,
        } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  // ─── UPDATE ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update a payment successfully', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockPayment());

      const result = await service.update(
        1,
        { room_fee: 700000 } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(result).toBeDefined();
    });

    it('should update month and year successfully', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      const payment = createMockPayment();
      repo.findById.mockResolvedValue(payment);
      dataSource.transaction = jest.fn(async (callback: any) =>
        callback({
          getRepository: jest.fn((entity: any) => ({
            save: jest.fn(async (data: any) => ({ ...data })),
            findOne: jest.fn(async () => ({
              ...payment,
              month: 8,
              year: 2027,
            })),
          })),
        }),
      );

      const result = await service.update(
        1,
        { month: 8, year: 2027 } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(result.month).toBe(8);
      expect(result.year).toBe(2027);
    });

    it('should clear paymentDate when status changes away from PAID', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      const payment = {
        ...createMockPayment(),
        status: PaymentStatus.UNPAID,
        paymentDate: new Date(),
      };
      repo.findById.mockResolvedValue(payment);
      dataSource.transaction = jest.fn(async (callback: any) =>
        callback({
          getRepository: jest.fn((entity: any) => ({
            save: jest.fn(async (data: any) => ({ ...data })),
            findOne: jest.fn(async () => ({
              ...payment,
              status: PaymentStatus.UNPAID,
              paymentDate: null,
            })),
          })),
        }),
      );

      const result = await service.update(
        1,
        { status: PaymentStatus.UNPAID } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(result.status).toBe(PaymentStatus.UNPAID);
      expect(result.paymentDate).toBeNull();
    });

    it('should assign total_amount directly when no fees are changed', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      const payment = createMockPayment();
      repo.findById.mockResolvedValue(payment);
      dataSource.transaction = jest.fn(async (callback: any) =>
        callback({
          getRepository: jest.fn((entity: any) => ({
            save: jest.fn(async (data: any) => ({ ...data })),
            findOne: jest.fn(async () => ({
              ...payment,
              totalAmount: 1000000,
            })),
          })),
        }),
      );

      const result = await service.update(
        1,
        { total_amount: 1000000 } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(result.totalAmount).toBe(1000000);
    });

    it('should throw NotFoundException when payment not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.update(
          999,
          { room_fee: 700000 } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject updating PAID payment', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.PAID,
      });

      await expect(
        service.update(
          1,
          { room_fee: 700000 } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject MANAGER without access', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockPayment());
      repo.managerHasBuildingAccess.mockResolvedValue(false);

      await expect(
        service.update(
          1,
          { room_fee: 700000 } as any,
          mockUser(2, UserRole.MANAGER),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update student and contract successfully for MANAGER with building access', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      const payment = createMockPayment();
      repo.findById.mockResolvedValue(payment);
      repo.managerHasBuildingAccess.mockResolvedValue(true);
      dataSource.manager.findOne = jest.fn(async (entity: any) => {
        if (entity.name === 'Student')
          return Promise.resolve({ ...mockStudent, id: 2, userId: 4 });
        if (entity.name === 'Contract')
          return Promise.resolve({
            ...mockContract,
            id: 2,
            studentId: 2,
            room: {
              ...mockRoom,
              building: { ...mockRoom.building, manager: { id: 2 } },
            },
          });
        return Promise.resolve(null);
      });
      dataSource.transaction = jest.fn(async (callback: any) =>
        callback({
          getRepository: jest.fn(() => ({
            save: jest.fn(async (data: any) => ({ ...data })),
            findOne: jest.fn(async () => ({
              ...payment,
              studentId: 2,
              contractId: 2,
            })),
          })),
        }),
      );

      const result = await service.update(
        1,
        { student_id: 2, contract_id: 2 } as any,
        mockUser(2, UserRole.MANAGER),
      );

      expect(result.studentId).toBe(2);
      expect(result.contractId).toBe(2);
    });

    it('should reject when updated student does not exist', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockPayment());
      dataSource.manager.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.update(
          1,
          { student_id: 999 } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject when updated contract does not exist', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockPayment());
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Contract') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      await expect(
        service.update(
          1,
          { contract_id: 999 } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject when MANAGER updates a contract outside their building', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockPayment());
      repo.managerHasBuildingAccess.mockResolvedValue(true);
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Contract')
          return Promise.resolve({
            ...mockContract,
            id: 2,
            room: {
              ...mockRoom,
              building: { ...mockRoom.building, manager: { id: 99 } },
            },
          });
        return Promise.resolve(null);
      });

      await expect(
        service.update(
          1,
          { contract_id: 2 } as any,
          mockUser(2, UserRole.MANAGER),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject when MANAGER updates a contract without building manager', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockPayment());
      repo.managerHasBuildingAccess.mockResolvedValue(true);
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'Contract')
          return Promise.resolve({
            ...mockContract,
            id: 2,
            room: {
              ...mockRoom,
              building: { ...mockRoom.building, manager: undefined },
            },
          });
        return Promise.resolve(null);
      });

      await expect(
        service.update(
          1,
          { contract_id: 2 } as any,
          mockUser(2, UserRole.MANAGER),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject when updated utility bill does not exist', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockPayment());
      dataSource.manager.findOne = jest.fn((entity: any) => {
        if (entity.name === 'UtilityBill') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      await expect(
        service.update(
          1,
          { utility_bill_id: 999 } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject duplicate invoice_code on update', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockPayment());
      repo.findByInvoiceCode.mockResolvedValue({ id: 2 });

      await expect(
        service.update(
          1,
          { invoice_code: 'DUPLICATE' } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should update utility bill id successfully', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      const payment = createMockPayment();
      repo.findById.mockResolvedValue(payment);
      dataSource.manager.findOne = jest.fn(
        async (entity: any, options: any) => {
          if (entity.name === 'UtilityBill') return mockUtilityBill;
          return null;
        },
      );
      dataSource.transaction = jest.fn(async (callback: any) =>
        callback({
          getRepository: jest.fn((entity: any) => ({
            save: jest.fn(async (data: any) => ({ ...data })),
            findOne: jest.fn(async () => ({
              ...payment,
              utilityBillId: 2,
            })),
          })),
        }),
      );

      const result = await service.update(
        1,
        { utility_bill_id: 2 } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(result.utilityBillId).toBe(2);
    });

    it('should update invoice_code successfully when unique', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      const payment = createMockPayment();
      repo.findById.mockResolvedValue(payment);
      repo.findByInvoiceCode.mockResolvedValue(null);
      dataSource.transaction = jest.fn(async (callback: any) =>
        callback({
          getRepository: jest.fn((entity: any) => ({
            save: jest.fn(async (data: any) => ({ ...data })),
            findOne: jest.fn(async () => ({
              ...payment,
              invoiceCode: 'INV002',
            })),
          })),
        }),
      );

      const result = await service.update(
        1,
        { invoice_code: 'INV002' } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(result.invoiceCode).toBe('INV002');
    });

    it('should reject invalid month on update', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockPayment());

      await expect(
        service.update(1, { month: 0 } as any, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid year on update', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockPayment());

      await expect(
        service.update(1, { year: 1999 } as any, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update due_date successfully', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      const payment = createMockPayment();
      repo.findById.mockResolvedValue(payment);
      dataSource.transaction = jest.fn(async (callback: any) =>
        callback({
          getRepository: jest.fn((entity: any) => ({
            save: jest.fn(async (data: any) => ({ ...data })),
            findOne: jest.fn(async () => ({
              ...payment,
              dueDate: new Date('2026-08-01'),
            })),
          })),
        }),
      );

      const result = await service.update(
        1,
        { due_date: new Date('2026-08-01') } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(result.dueDate).toEqual(new Date('2026-08-01'));
    });

    it('should set paymentDate when status changes to PAID', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      const payment = createMockPayment();
      repo.findById.mockResolvedValue(payment);
      repo.findByInvoiceCode.mockResolvedValue(null);
      dataSource.transaction = jest.fn(async (callback: any) =>
        callback({
          getRepository: jest.fn((entity: any) => ({
            save: jest.fn(async (data: any) => ({ ...data })),
            findOne: jest.fn(async () => ({
              ...payment,
              status: PaymentStatus.PAID,
              paymentDate: new Date(),
            })),
          })),
        }),
      );

      const result = await service.update(
        1,
        { status: PaymentStatus.PAID } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(result.status).toBe(PaymentStatus.PAID);
      expect(result.paymentDate).not.toBeNull();
    });

    it('should update payment_method on update', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      const payment = createMockPayment();
      repo.findById.mockResolvedValue(payment);
      dataSource.transaction = jest.fn(async (callback: any) =>
        callback({
          getRepository: jest.fn((entity: any) => ({
            save: jest.fn(async (data: any) => ({ ...data })),
            findOne: jest.fn(async () => ({
              ...payment,
              paymentMethod: 'CASH',
            })),
          })),
        }),
      );

      const result = await service.update(
        1,
        { payment_method: 'CASH' } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(result.paymentMethod).toBe('CASH');
    });

    it('should accept exact total_amount when fees change', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      const payment = createMockPayment();
      repo.findById.mockResolvedValue(payment);
      dataSource.transaction = jest.fn(async (callback: any) =>
        callback({
          getRepository: jest.fn((entity: any) => ({
            save: jest.fn(async (data: any) => ({ ...data })),
            findOne: jest.fn(async () => ({
              ...payment,
              roomFee: 600000,
              electricFee: 175000,
              waterFee: 50000,
              otherFee: 0,
              totalAmount: 825000,
            })),
          })),
        }),
      );

      const result = await service.update(
        1,
        {
          room_fee: 600000,
          electric_fee: 175000,
          water_fee: 50000,
          other_fee: 0,
          total_amount: 825000,
        } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(result.totalAmount).toBe(825000);
    });

    it('should throw NotFoundException when updated payment is not found after transaction', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockPayment());
      dataSource.transaction = jest.fn(async (callback: any) =>
        callback({
          getRepository: jest.fn((entity: any) => ({
            save: jest.fn(async (data: any) => ({ ...data })),
            findOne: jest.fn(async () => null),
          })),
        }),
      );

      await expect(
        service.update(
          1,
          { room_fee: 700000 } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject when total_amount mismatch on fee update', async () => {
      const { service, repo } = createServiceWithMocks();
      const payment = createMockPayment();
      repo.findById.mockResolvedValue(payment);

      await expect(
        service.update(
          1,
          {
            room_fee: 600000,
            electric_fee: 100000,
            water_fee: 50000,
            other_fee: 0,
            total_amount: 999999,
          } as any,
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use transaction for update', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(createMockPayment());

      await service.update(
        1,
        { room_fee: 700000 } as any,
        mockUser(1, UserRole.ADMIN),
      );

      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  // ─── REMOVE ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete a payment successfully', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockPayment);

      const result = await service.remove(1, mockUser(1, UserRole.ADMIN));

      expect(result).toEqual({ message: 'Payment deleted successfully' });
    });

    it('should throw NotFoundException when payment not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.remove(999, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject deleting PAID payment', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.PAID,
      });

      await expect(
        service.remove(1, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject MANAGER without access', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockPayment);
      repo.managerHasBuildingAccess.mockResolvedValue(false);

      await expect(
        service.remove(1, mockUser(2, UserRole.MANAGER)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should use transaction for delete', async () => {
      const { service, repo, dataSource } = createServiceWithMocks();
      repo.findById.mockResolvedValue(mockPayment);

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
      repo.findById.mockResolvedValue(mockPayment);

      await expect(
        service.findAll({}, mockUser(1, UserRole.ADMIN)),
      ).resolves.toBeDefined();
      await expect(
        service.findOne(1, mockUser(1, UserRole.ADMIN)),
      ).resolves.toBeDefined();
    });

    it('should serialize a payment with missing relations to a response', () => {
      const { service } = createServiceWithMocks();
      const payment = {
        ...mockPayment,
        student: null,
        contract: null,
        utilityBill: null,
      };

      const result = (service as any).toPaymentResponse(payment as any);

      expect(result.student).toBeNull();
      expect(result.contract).toBeNull();
      expect(result.utilityBill).toBeNull();
      expect(result.paymentDate).toBeNull();
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
