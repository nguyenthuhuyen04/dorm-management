import { Test, TestingModule } from '@nestjs/testing';
import { UtilityBillsController } from './utility-bills.controller';
import { UtilityBillsService } from './utility-bills.service';
import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../users/user.entity';

describe('UtilityBillsController', () => {
  let controller: UtilityBillsController;
  let utilityBillsService: any;

  const mockUser = (userId: number, role: UserRole) => ({
    userId,
    role,
  });

  beforeEach(async () => {
    utilityBillsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UtilityBillsController],
      providers: [
        {
          provide: UtilityBillsService,
          useValue: utilityBillsService,
        },
      ],
    }).compile();

    controller = module.get<UtilityBillsController>(UtilityBillsController);
  });

  // ─── GET /utility-bills ─────────────────────────────────────────────────

  describe('GET /utility-bills (findAll)', () => {
    it('should call service.findAll with query params and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      utilityBillsService.findAll.mockResolvedValue({
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
        'A',
        '101',
        '7',
        '2026',
        'DRAFT',
        'id',
        'ASC',
      );

      expect(utilityBillsService.findAll).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          search: 'search',
          building: 'A',
          room: '101',
          month: 7,
          year: 2026,
          status: 'DRAFT',
          sortBy: 'id',
          sortOrder: 'ASC',
        },
        req.user,
      );
      expect(result.total).toBe(1);
    });

    it('should use default pagination when no query params', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      utilityBillsService.findAll.mockResolvedValue({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        data: [],
      });

      await controller.findAll(req as any, undefined, undefined);

      expect(utilityBillsService.findAll).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          search: undefined,
          building: undefined,
          room: undefined,
          month: undefined,
          year: undefined,
          status: undefined,
          sortBy: undefined,
          sortOrder: undefined,
        },
        req.user,
      );
    });

    it('should trim search query params', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      utilityBillsService.findAll.mockResolvedValue({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        data: [],
      });

      await controller.findAll(req as any, '1', '10', '  search  ');

      expect(utilityBillsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'search' }),
        req.user,
      );
    });
  });

  // ─── GET /utility-bills/:id ─────────────────────────────────────────────

  describe('GET /utility-bills/:id (findOne)', () => {
    it('should call service.findOne with parsed id and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      utilityBillsService.findOne.mockResolvedValue({ id: 1 });

      const result = await controller.findOne('1', req as any);

      expect(utilityBillsService.findOne).toHaveBeenCalledWith(1, req.user);
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

  // ─── POST /utility-bills ────────────────────────────────────────────────

  describe('POST /utility-bills (create)', () => {
    it('should call service.create with DTO and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      const dto = {
        room_id: 1,
        month: 8,
        year: 2026,
        electric_old: 1050,
        electric_new: 1100,
        water_old: 510,
        water_new: 520,
      };
      utilityBillsService.create.mockResolvedValue({ id: 1, month: 8 });

      const result = await controller.create(dto as any, req as any);

      expect(utilityBillsService.create).toHaveBeenCalledWith(dto, req.user);
      expect(result.id).toBe(1);
    });
  });

  // ─── PUT /utility-bills/:id ─────────────────────────────────────────────

  describe('PUT /utility-bills/:id (update)', () => {
    it('should call service.update with parsed id, DTO and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      const dto = { electric_fee: 200000 };
      utilityBillsService.update.mockResolvedValue({ id: 1 });

      const result = await controller.update('1', dto as any, req as any);

      expect(utilityBillsService.update).toHaveBeenCalledWith(1, dto, req.user);
      expect(result.id).toBe(1);
    });

    it('should throw BadRequestException for invalid id', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };

      await expect(
        controller.update('abc', {} as any, req as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── DELETE /utility-bills/:id ──────────────────────────────────────────

  describe('DELETE /utility-bills/:id (remove)', () => {
    it('should call service.remove with parsed id and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      utilityBillsService.remove.mockResolvedValue({
        message: 'Utility bill deleted successfully',
      });

      const result = await controller.remove('1', req as any);

      expect(utilityBillsService.remove).toHaveBeenCalledWith(1, req.user);
      expect(result.message).toBe('Utility bill deleted successfully');
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
    it('GET /utility-bills should be accessible by ADMIN, MANAGER, STUDENT', () => {
      const roles = Reflect.getMetadata(
        'roles',
        UtilityBillsController.prototype.findAll,
      );
      expect(roles).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.STUDENT,
      ]);
    });

    it('GET /utility-bills/:id should be accessible by ADMIN, MANAGER, STUDENT', () => {
      const roles = Reflect.getMetadata(
        'roles',
        UtilityBillsController.prototype.findOne,
      );
      expect(roles).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.STUDENT,
      ]);
    });

    it('POST /utility-bills should be accessible by ADMIN and MANAGER', () => {
      const roles = Reflect.getMetadata(
        'roles',
        UtilityBillsController.prototype.create,
      );
      expect(roles).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });

    it('PUT /utility-bills/:id should be accessible by ADMIN and MANAGER', () => {
      const roles = Reflect.getMetadata(
        'roles',
        UtilityBillsController.prototype.update,
      );
      expect(roles).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });

    it('DELETE /utility-bills/:id should be accessible by ADMIN only', () => {
      const roles = Reflect.getMetadata(
        'roles',
        UtilityBillsController.prototype.remove,
      );
      expect(roles).toEqual([UserRole.ADMIN]);
    });
  });
});
