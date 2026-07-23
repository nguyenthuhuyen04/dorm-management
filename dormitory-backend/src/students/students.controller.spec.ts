import { Test, TestingModule } from '@nestjs/testing';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../users/user.entity';

describe('StudentsController', () => {
  let controller: StudentsController;
  let studentsService: any;

  const mockUser = (userId: number, role: UserRole) => ({
    userId,
    role,
  });

  beforeEach(async () => {
    studentsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentsController],
      providers: [
        {
          provide: StudentsService,
          useValue: studentsService,
        },
      ],
    }).compile();

    controller = module.get<StudentsController>(StudentsController);
  });

  // ─── GET /students ──────────────────────────────────────────────────────

  describe('GET /students (findAll)', () => {
    it('should call service.findAll with query params and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      studentsService.findAll.mockResolvedValue({
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
        'SV001',
        'CNTT',
        'ClassA',
        'Female',
        'A',
        '101',
        'CNTT',
        'ACTIVE',
      );

      expect(studentsService.findAll).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          search: 'search',
          studentCode: 'SV001',
          faculty: 'CNTT',
          className: 'ClassA',
          gender: 'Female',
          building: 'A',
          room: '101',
          course: 'CNTT',
          status: 'ACTIVE',
        },
        req.user,
      );
      expect(result.total).toBe(1);
    });

    it('should call service.findAll with default pagination when no query params', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      studentsService.findAll.mockResolvedValue({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        data: [],
      });

      await controller.findAll(req as any, undefined, undefined);

      expect(studentsService.findAll).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          search: undefined,
          studentCode: undefined,
          faculty: undefined,
          className: undefined,
          gender: undefined,
          building: undefined,
          room: undefined,
          course: undefined,
          status: undefined,
        },
        req.user,
      );
    });

    it('should trim search query params', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      studentsService.findAll.mockResolvedValue({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        data: [],
      });

      await controller.findAll(
        req as any,
        '1',
        '10',
        '  search  ',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(studentsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'search' }),
        req.user,
      );
    });
  });

  // ─── GET /students/:id ──────────────────────────────────────────────────

  describe('GET /students/:id (findOne)', () => {
    it('should call service.findOne with parsed id and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      studentsService.findOne.mockResolvedValue({ id: 1 });

      const result = await controller.findOne('1', req as any);

      expect(studentsService.findOne).toHaveBeenCalledWith(1, req.user);
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

  // ─── POST /students ─────────────────────────────────────────────────────

  describe('POST /students (create)', () => {
    it('should call service.create with DTO and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      const dto = {
        user_id: 3,
        student_code: 'SV100',
        gender: 'Female',
        faculty: 'CNTT',
      };
      studentsService.create.mockResolvedValue({ id: 1, studentCode: 'SV100' });

      const result = await controller.create(dto as any, req as any);

      expect(studentsService.create).toHaveBeenCalledWith(dto, req.user);
      expect(result.studentCode).toBe('SV100');
    });
  });

  // ─── PUT /students/:id ──────────────────────────────────────────────────

  describe('PUT /students/:id (update)', () => {
    it('should call service.update with parsed id, DTO and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      const dto = { faculty: 'New Faculty' };
      studentsService.update.mockResolvedValue({ id: 1 });

      const result = await controller.update('1', dto as any, req as any);

      expect(studentsService.update).toHaveBeenCalledWith(1, dto, req.user);
      expect(result.id).toBe(1);
    });

    it('should throw BadRequestException for invalid id', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };

      await expect(
        controller.update('abc', {} as any, req as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── DELETE /students/:id ───────────────────────────────────────────────

  describe('DELETE /students/:id (remove)', () => {
    it('should call service.remove with parsed id and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      studentsService.remove.mockResolvedValue({
        message: 'Student account disabled successfully',
      });

      const result = await controller.remove('1', req as any);

      expect(studentsService.remove).toHaveBeenCalledWith(1, req.user);
      expect(result.message).toBe('Student account disabled successfully');
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
    it('GET /students should be accessible by ADMIN, MANAGER, STUDENT', () => {
      const roles = Reflect.getMetadata(
        'roles',
        StudentsController.prototype.findAll,
      );
      expect(roles).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.STUDENT,
      ]);
    });

    it('GET /students/:id should be accessible by ADMIN, MANAGER, STUDENT', () => {
      const roles = Reflect.getMetadata(
        'roles',
        StudentsController.prototype.findOne,
      );
      expect(roles).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.STUDENT,
      ]);
    });

    it('POST /students should be accessible by ADMIN only', () => {
      const roles = Reflect.getMetadata(
        'roles',
        StudentsController.prototype.create,
      );
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('PUT /students/:id should be accessible by ADMIN and STUDENT', () => {
      const roles = Reflect.getMetadata(
        'roles',
        StudentsController.prototype.update,
      );
      expect(roles).toEqual([UserRole.ADMIN, UserRole.STUDENT]);
    });

    it('DELETE /students/:id should be accessible by ADMIN only', () => {
      const roles = Reflect.getMetadata(
        'roles',
        StudentsController.prototype.remove,
      );
      expect(roles).toEqual([UserRole.ADMIN]);
    });
  });
});
