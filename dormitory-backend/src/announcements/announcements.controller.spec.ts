import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../users/user.entity';

describe('AnnouncementsController', () => {
  let controller: AnnouncementsController;
  let announcementsService: any;

  const mockUser = (userId: number, role: UserRole) => ({
    userId,
    role,
  });

  beforeEach(async () => {
    announcementsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnnouncementsController],
      providers: [
        {
          provide: AnnouncementsService,
          useValue: announcementsService,
        },
      ],
    }).compile();

    controller = module.get<AnnouncementsController>(AnnouncementsController);
  });

  // ─── GET /announcements ──────────────────────────────────────────────────

  describe('GET /announcements (findAll)', () => {
    it('should call service.findAll with query params and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      announcementsService.findAll.mockResolvedValue({
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
        'STUDENT',
        '2',
      );

      expect(announcementsService.findAll).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          search: 'search',
          target_role: 'STUDENT',
          created_by: '2',
        },
        req.user,
      );
      expect(result.total).toBe(1);
    });

    it('should use default pagination when no query params', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      announcementsService.findAll.mockResolvedValue({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        data: [],
      });

      await controller.findAll(req as any, undefined, undefined);

      expect(announcementsService.findAll).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          search: undefined,
          target_role: undefined,
          created_by: undefined,
        },
        req.user,
      );
    });
  });

  // ─── GET /announcements/:id ──────────────────────────────────────────────

  describe('GET /announcements/:id (findOne)', () => {
    it('should call service.findOne with parsed id and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      announcementsService.findOne.mockResolvedValue({ id: 1 });

      const result = await controller.findOne('1', req as any);

      expect(announcementsService.findOne).toHaveBeenCalledWith(1, req.user);
      expect(result.id).toBe(1);
    });

    it('should throw BadRequestException for invalid id', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };

      await expect(controller.findOne('abc', req as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── POST /announcements ────────────────────────────────────────────────

  describe('POST /announcements (create)', () => {
    it('should call service.create with DTO and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      const dto = {
        title: 'New Announcement',
        content: 'New content',
        target_role: 'ALL',
      };
      announcementsService.create.mockResolvedValue({
        id: 1,
        title: 'New Announcement',
      });

      const result = await controller.create(dto as any, req as any);

      expect(announcementsService.create).toHaveBeenCalledWith(dto, req.user);
      expect(result.title).toBe('New Announcement');
    });
  });

  // ─── PUT /announcements/:id ─────────────────────────────────────────────

  describe('PUT /announcements/:id (update)', () => {
    it('should call service.update with parsed id, DTO and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      const dto = { title: 'Updated Title' };
      announcementsService.update.mockResolvedValue({ id: 1 });

      const result = await controller.update('1', dto as any, req as any);

      expect(announcementsService.update).toHaveBeenCalledWith(
        1,
        dto,
        req.user,
      );
      expect(result.id).toBe(1);
    });

    it('should throw BadRequestException for invalid id', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };

      await expect(
        controller.update('abc', {} as any, req as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── DELETE /announcements/:id ───────────────────────────────────────────

  describe('DELETE /announcements/:id (remove)', () => {
    it('should call service.remove with parsed id and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      announcementsService.remove.mockResolvedValue({
        message: 'Announcement deleted successfully',
      });

      const result = await controller.remove('1', req as any);

      expect(announcementsService.remove).toHaveBeenCalledWith(1, req.user);
      expect(result.message).toBe('Announcement deleted successfully');
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
    it('GET /announcements should be accessible by ADMIN, MANAGER, STUDENT', () => {
      const roles = Reflect.getMetadata(
        'roles',
        AnnouncementsController.prototype.findAll,
      );
      expect(roles).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.STUDENT,
      ]);
    });

    it('GET /announcements/:id should be accessible by ADMIN, MANAGER, STUDENT', () => {
      const roles = Reflect.getMetadata(
        'roles',
        AnnouncementsController.prototype.findOne,
      );
      expect(roles).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.STUDENT,
      ]);
    });

    it('POST /announcements should be accessible by ADMIN and MANAGER', () => {
      const roles = Reflect.getMetadata(
        'roles',
        AnnouncementsController.prototype.create,
      );
      expect(roles).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });

    it('PUT /announcements/:id should be accessible by ADMIN and MANAGER', () => {
      const roles = Reflect.getMetadata(
        'roles',
        AnnouncementsController.prototype.update,
      );
      expect(roles).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });

    it('DELETE /announcements/:id should be accessible by ADMIN and MANAGER', () => {
      const roles = Reflect.getMetadata(
        'roles',
        AnnouncementsController.prototype.remove,
      );
      expect(roles).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });
  });
});
