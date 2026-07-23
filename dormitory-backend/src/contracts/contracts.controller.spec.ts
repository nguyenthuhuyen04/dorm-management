import { Test, TestingModule } from '@nestjs/testing';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../users/user.entity';

describe('ContractsController', () => {
  let controller: ContractsController;
  let contractsService: any;

  const mockUser = (userId: number, role: UserRole) => ({
    userId,
    role,
  });

  beforeEach(async () => {
    contractsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractsController],
      providers: [
        {
          provide: ContractsService,
          useValue: contractsService,
        },
      ],
    }).compile();

    controller = module.get<ContractsController>(ContractsController);
  });

  // ─── GET /contracts ──────────────────────────────────────────────────────

  describe('GET /contracts (findAll)', () => {
    it('should call service.findAll with query params and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      contractsService.findAll.mockResolvedValue({
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
        'ACTIVE',
        'A',
        '101',
        'SV001',
        'Manager',
        '2024-01-01',
        '2024-12-31',
        '2024-01-01',
        'id',
        'ASC',
      );

      expect(contractsService.findAll).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          search: 'search',
          status: 'ACTIVE',
          building: 'A',
          room: '101',
          student: 'SV001',
          manager: 'Manager',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          created_at: '2024-01-01',
          sortBy: 'id',
          sortOrder: 'ASC',
        },
        req.user,
      );
      expect(result.total).toBe(1);
    });

    it('should use default pagination when no query params', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      contractsService.findAll.mockResolvedValue({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        data: [],
      });

      await controller.findAll(req as any, undefined, undefined);

      expect(contractsService.findAll).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          search: undefined,
          status: undefined,
          building: undefined,
          room: undefined,
          student: undefined,
          manager: undefined,
          start_date: undefined,
          end_date: undefined,
          created_at: undefined,
          sortBy: undefined,
          sortOrder: undefined,
        },
        req.user,
      );
    });

    it('should trim search query params', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      contractsService.findAll.mockResolvedValue({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        data: [],
      });

      await controller.findAll(req as any, '1', '10', '  search  ');

      expect(contractsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'search' }),
        req.user,
      );
    });
  });

  // ─── GET /contracts/:id ──────────────────────────────────────────────────

  describe('GET /contracts/:id (findOne)', () => {
    it('should call service.findOne with parsed id and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      contractsService.findOne.mockResolvedValue({ id: 1 });

      const result = await controller.findOne('1', req as any);

      expect(contractsService.findOne).toHaveBeenCalledWith(1, req.user);
      expect(result.id).toBe(1);
    });

    it('should throw BadRequestException for invalid id', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };

      await expect(controller.findOne('abc', req as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for NaN id', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };

      await expect(controller.findOne('NaN', req as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── POST /contracts ─────────────────────────────────────────────────────

  describe('POST /contracts (create)', () => {
    it('should call service.create with DTO and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      const dto = {
        contract_code: 'HD100',
        student_id: 1,
        room_id: 1,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        deposit: 500000,
      };
      contractsService.create.mockResolvedValue({
        id: 1,
        contractCode: 'HD100',
      });

      const result = await controller.create(dto as any, req as any);

      expect(contractsService.create).toHaveBeenCalledWith(dto, req.user);
      expect(result.contractCode).toBe('HD100');
    });
  });

  // ─── PUT /contracts/:id ──────────────────────────────────────────────────

  describe('PUT /contracts/:id (update)', () => {
    it('should call service.update with parsed id, DTO and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      const dto = { deposit: 600000 };
      contractsService.update.mockResolvedValue({ id: 1 });

      const result = await controller.update('1', dto as any, req as any);

      expect(contractsService.update).toHaveBeenCalledWith(1, dto, req.user);
      expect(result.id).toBe(1);
    });

    it('should throw BadRequestException for invalid id', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };

      await expect(
        controller.update('abc', {} as any, req as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── DELETE /contracts/:id ───────────────────────────────────────────────

  describe('DELETE /contracts/:id (remove)', () => {
    it('should call service.remove with parsed id and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      contractsService.remove.mockResolvedValue({
        message: 'Contract deleted successfully',
      });

      const result = await controller.remove('1', req as any);

      expect(contractsService.remove).toHaveBeenCalledWith(1, req.user);
      expect(result.message).toBe('Contract deleted successfully');
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
    it('GET /contracts should be accessible by ADMIN, MANAGER, STUDENT', () => {
      const roles = Reflect.getMetadata(
        'roles',
        ContractsController.prototype.findAll,
      );
      expect(roles).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.STUDENT,
      ]);
    });

    it('GET /contracts/:id should be accessible by ADMIN, MANAGER, STUDENT', () => {
      const roles = Reflect.getMetadata(
        'roles',
        ContractsController.prototype.findOne,
      );
      expect(roles).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.STUDENT,
      ]);
    });

    it('POST /contracts should be accessible by ADMIN and MANAGER', () => {
      const roles = Reflect.getMetadata(
        'roles',
        ContractsController.prototype.create,
      );
      expect(roles).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });

    it('PUT /contracts/:id should be accessible by ADMIN and MANAGER', () => {
      const roles = Reflect.getMetadata(
        'roles',
        ContractsController.prototype.update,
      );
      expect(roles).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });

    it('DELETE /contracts/:id should be accessible by ADMIN and MANAGER', () => {
      const roles = Reflect.getMetadata(
        'roles',
        ContractsController.prototype.remove,
      );
      expect(roles).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });
  });
});
