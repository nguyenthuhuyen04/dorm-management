import { Test, TestingModule } from '@nestjs/testing';
import { RegulationsController } from './regulations.controller';
import { RegulationsService } from './regulations.service';
import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../users/user.entity';

describe('RegulationsController', () => {
  let controller: RegulationsController;
  let regulationsService: any;

  const mockUser = (userId: number, role: UserRole) => ({
    userId,
    role,
  });

  beforeEach(async () => {
    regulationsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegulationsController],
      providers: [
        {
          provide: RegulationsService,
          useValue: regulationsService,
        },
      ],
    }).compile();

    controller = module.get<RegulationsController>(RegulationsController);
  });

  // ─── GET /regulations ──────────────────────────────────────────────────

  describe('GET /regulations (findAll)', () => {
    it('should call service.findAll with query params and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      regulationsService.findAll.mockResolvedValue({
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
        '1',
      );

      expect(regulationsService.findAll).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          search: 'search',
          created_by: '1',
        },
        req.user,
      );
      expect(result.total).toBe(1);
    });

    it('should use default pagination when no query params', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      regulationsService.findAll.mockResolvedValue({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        data: [],
      });

      await controller.findAll(req as any, undefined, undefined);

      expect(regulationsService.findAll).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          search: undefined,
          created_by: undefined,
        },
        req.user,
      );
    });
  });

  // ─── GET /regulations/:id ──────────────────────────────────────────────

  describe('GET /regulations/:id (findOne)', () => {
    it('should call service.findOne with parsed id and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      regulationsService.findOne.mockResolvedValue({ id: 1 });

      const result = await controller.findOne('1', req as any);

      expect(regulationsService.findOne).toHaveBeenCalledWith(1, req.user);
      expect(result.id).toBe(1);
    });

    it('should throw BadRequestException for invalid id', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };

      await expect(controller.findOne('abc', req as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── POST /regulations ────────────────────────────────────────────────

  describe('POST /regulations (create)', () => {
    it('should call service.create with DTO and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      const dto = {
        title: 'New Regulation',
        content: 'New content',
      };
      regulationsService.create.mockResolvedValue({
        id: 1,
        title: 'New Regulation',
      });

      const result = await controller.create(dto as any, req as any);

      expect(regulationsService.create).toHaveBeenCalledWith(dto, req.user);
      expect(result.title).toBe('New Regulation');
    });
  });

  // ─── PUT /regulations/:id ─────────────────────────────────────────────

  describe('PUT /regulations/:id (update)', () => {
    it('should call service.update with parsed id, DTO and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      const dto = { title: 'Updated Title' };
      regulationsService.update.mockResolvedValue({ id: 1 });

      const result = await controller.update('1', dto as any, req as any);

      expect(regulationsService.update).toHaveBeenCalledWith(1, dto, req.user);
      expect(result.id).toBe(1);
    });

    it('should throw BadRequestException for invalid id', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };

      await expect(
        controller.update('abc', {} as any, req as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── DELETE /regulations/:id ───────────────────────────────────────────

  describe('DELETE /regulations/:id (remove)', () => {
    it('should call service.remove with parsed id and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      regulationsService.remove.mockResolvedValue({
        message: 'Regulation deleted successfully',
      });

      const result = await controller.remove('1', req as any);

      expect(regulationsService.remove).toHaveBeenCalledWith(1, req.user);
      expect(result.message).toBe('Regulation deleted successfully');
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
    it('GET /regulations should be accessible by ADMIN, MANAGER, STUDENT', () => {
      const roles = Reflect.getMetadata(
        'roles',
        RegulationsController.prototype.findAll,
      );
      expect(roles).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.STUDENT,
      ]);
    });

    it('GET /regulations/:id should be accessible by ADMIN, MANAGER, STUDENT', () => {
      const roles = Reflect.getMetadata(
        'roles',
        RegulationsController.prototype.findOne,
      );
      expect(roles).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.STUDENT,
      ]);
    });

    it('POST /regulations should be accessible by ADMIN only', () => {
      const roles = Reflect.getMetadata(
        'roles',
        RegulationsController.prototype.create,
      );
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('PUT /regulations/:id should be accessible by ADMIN only', () => {
      const roles = Reflect.getMetadata(
        'roles',
        RegulationsController.prototype.update,
      );
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('DELETE /regulations/:id should be accessible by ADMIN only', () => {
      const roles = Reflect.getMetadata(
        'roles',
        RegulationsController.prototype.remove,
      );
      expect(roles).toEqual([UserRole.ADMIN]);
    });
  });
});
