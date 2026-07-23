import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../users/user.entity';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: any;

  const mockUser = (userId: number, role: UserRole) => ({
    userId,
    role,
  });

  beforeEach(async () => {
    paymentsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: paymentsService,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  // ─── GET /payments ──────────────────────────────────────────────────────

  describe('GET /payments (findAll)', () => {
    it('should call service.findAll with query params and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      paymentsService.findAll.mockResolvedValue({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        data: [],
      });

      const result = await controller.findAll(
        req as any,
        '1',
        '10',
        'search',
        '7',
        '2026',
        'UNPAID',
        '1',
        '1',
        'CASH',
        'id',
        'ASC',
      );

      expect(paymentsService.findAll).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          search: 'search',
          month: 7,
          year: 2026,
          status: 'UNPAID',
          room_id: 1,
          student_id: 1,
          payment_method: 'CASH',
          sortBy: 'id',
          sortOrder: 'ASC',
        },
        req.user,
      );
      expect(result.total).toBe(1);
    });

    it('should use default pagination when no query params', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      paymentsService.findAll.mockResolvedValue({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        data: [],
      });

      await controller.findAll(req as any, undefined, undefined);

      expect(paymentsService.findAll).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          search: undefined,
          month: undefined,
          year: undefined,
          status: undefined,
          room_id: undefined,
          student_id: undefined,
          payment_method: undefined,
          sortBy: undefined,
          sortOrder: undefined,
        },
        req.user,
      );
    });
  });

  // ─── GET /payments/:id ──────────────────────────────────────────────────

  describe('GET /payments/:id (findOne)', () => {
    it('should call service.findOne with parsed id and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      paymentsService.findOne.mockResolvedValue({ id: 1 });

      const result = await controller.findOne('1', req as any);

      expect(paymentsService.findOne).toHaveBeenCalledWith(1, req.user);
      expect(result.id).toBe(1);
    });

    it('should throw BadRequestException for invalid id', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };

      await expect(controller.findOne('abc', req as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── POST /payments ─────────────────────────────────────────────────────

  describe('POST /payments (create)', () => {
    it('should call service.create with DTO and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      const dto = {
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
        due_date: new Date('2026-07-20'),
      };
      paymentsService.create.mockResolvedValue({
        id: 1,
        invoiceCode: 'INV100',
      });

      const result = await controller.create(dto as any, req as any);

      expect(paymentsService.create).toHaveBeenCalledWith(dto, req.user);
      expect(result.invoiceCode).toBe('INV100');
    });
  });

  // ─── PUT /payments/:id ──────────────────────────────────────────────────

  describe('PUT /payments/:id (update)', () => {
    it('should call service.update with parsed id, DTO and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      const dto = { room_fee: 700000 };
      paymentsService.update.mockResolvedValue({ id: 1 });

      const result = await controller.update('1', dto as any, req as any);

      expect(paymentsService.update).toHaveBeenCalledWith(1, dto, req.user);
      expect(result.id).toBe(1);
    });

    it('should throw BadRequestException for invalid id', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };

      await expect(
        controller.update('abc', {} as any, req as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── DELETE /payments/:id ───────────────────────────────────────────────

  describe('DELETE /payments/:id (remove)', () => {
    it('should call service.remove with parsed id and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      paymentsService.remove.mockResolvedValue({
        message: 'Payment deleted successfully',
      });

      const result = await controller.remove('1', req as any);

      expect(paymentsService.remove).toHaveBeenCalledWith(1, req.user);
      expect(result.message).toBe('Payment deleted successfully');
    });

    it('should throw BadRequestException for invalid id', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };

      await expect(controller.remove('abc', req as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── ROLE DECORATORS ────────────────────────────────────────────────────

  describe('Roles decorator on endpoints', () => {
    it('GET /payments should be accessible by ADMIN, MANAGER, STUDENT', () => {
      const roles = Reflect.getMetadata(
        'roles',
        PaymentsController.prototype.findAll,
      );
      expect(roles).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.STUDENT,
      ]);
    });

    it('GET /payments/:id should be accessible by ADMIN, MANAGER, STUDENT', () => {
      const roles = Reflect.getMetadata(
        'roles',
        PaymentsController.prototype.findOne,
      );
      expect(roles).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.STUDENT,
      ]);
    });

    it('POST /payments should be accessible by ADMIN and MANAGER', () => {
      const roles = Reflect.getMetadata(
        'roles',
        PaymentsController.prototype.create,
      );
      expect(roles).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });

    it('PUT /payments/:id should be accessible by ADMIN and MANAGER', () => {
      const roles = Reflect.getMetadata(
        'roles',
        PaymentsController.prototype.update,
      );
      expect(roles).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });

    it('DELETE /payments/:id should be accessible by ADMIN and MANAGER', () => {
      const roles = Reflect.getMetadata(
        'roles',
        PaymentsController.prototype.remove,
      );
      expect(roles).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });
  });
});
