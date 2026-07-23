import { DataSource } from 'typeorm';
import { PaymentsRepository } from './payments.repository';
import { Payment } from './payment.entity';

describe('PaymentsRepository', () => {
  let repository: PaymentsRepository;
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

    repository = new PaymentsRepository(dataSource as any);
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
    it('should find a payment by id with relations', async () => {
      const mockPayment = { id: 1, invoiceCode: 'INV001', student: { id: 1 } };
      mockRepositoryMethods.findOne.mockResolvedValue(mockPayment);

      const result = await repository.findById(1);

      expect(mockRepositoryMethods.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: [
          'student',
          'student.user',
          'contract',
          'contract.room',
          'contract.room.building',
          'utilityBill',
        ],
      });
      expect(result).toEqual(mockPayment);
    });

    it('should return null when payment not found', async () => {
      mockRepositoryMethods.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByInvoiceCode', () => {
    it('should find a payment by invoice code', async () => {
      const mockPayment = { id: 1, invoiceCode: 'INV001' };
      mockRepositoryMethods.findOne.mockResolvedValue(mockPayment);

      const result = await repository.findByInvoiceCode('INV001');

      expect(mockRepositoryMethods.findOne).toHaveBeenCalledWith({
        where: { invoiceCode: 'INV001' },
      });
      expect(result).toEqual(mockPayment);
    });

    it('should return null when not found', async () => {
      mockRepositoryMethods.findOne.mockResolvedValue(null);

      const result = await repository.findByInvoiceCode('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('findByStudent', () => {
    it('should find payments by student id', async () => {
      const mockPayments = [{ id: 1, invoiceCode: 'INV001' }];
      mockRepositoryMethods.find.mockResolvedValue(mockPayments);

      const result = await repository.findByStudent(1);

      expect(mockRepositoryMethods.find).toHaveBeenCalledWith({
        where: { studentId: 1 },
        relations: expect.any(Array),
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockPayments);
    });
  });

  describe('findByContract', () => {
    it('should find payments by contract id', async () => {
      mockRepositoryMethods.find.mockResolvedValue([]);

      await repository.findByContract(1);

      expect(mockRepositoryMethods.find).toHaveBeenCalledWith({
        where: { contractId: 1 },
        relations: expect.any(Array),
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findByUtilityBill', () => {
    it('should find payments by utility bill id', async () => {
      mockRepositoryMethods.find.mockResolvedValue([]);

      await repository.findByUtilityBill(1);

      expect(mockRepositoryMethods.find).toHaveBeenCalledWith({
        where: { utilityBillId: 1 },
        relations: expect.any(Array),
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findByRoom', () => {
    it('should find payments by room id using query builder', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await repository.findByRoom(1);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledTimes(6);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'contract.roomId = :roomId',
        { roomId: 1 },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'payment.createdAt',
        'DESC',
      );
    });
  });

  describe('findByBuilding', () => {
    it('should find payments by building id using query builder', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await repository.findByBuilding(1);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'building.id = :buildingId',
        { buildingId: 1 },
      );
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

  describe('studentHasPaymentAccess', () => {
    it('should return true when student has access', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 1 }]);

      const result = await repository.studentHasPaymentAccess(1, 3);

      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT EXISTS'),
        [1, 3],
      );
      expect(result).toBe(true);
    });

    it('should return false when student has no access', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 0 }]);

      const result = await repository.studentHasPaymentAccess(1, 999);

      expect(result).toBe(false);
    });
  });

  describe('findByRoomAndMonth', () => {
    it('should find payment by room, month, year', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ id: 1 });

      const result = await repository.findByRoomAndMonth(1, 7, 2026);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'contract.roomId = :roomId',
        { roomId: 1 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'payment.month = :month',
        { month: 7 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'payment.year = :year',
        { year: 2026 },
      );
      expect(result).toEqual({ id: 1 });
    });
  });
});
