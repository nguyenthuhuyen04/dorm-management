import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SupportRequestsController } from './support-requests.controller';
import { SupportRequestsService } from './support-requests.service';
import { UserRole } from '../users/user.entity';
import { SupportStatus } from '../common/enums/user-role.enum';

describe('SupportRequestsController', () => {
  let controller: SupportRequestsController;
  let service: any;

  const mockUser = (userId: number, role: UserRole) => ({
    userId,
    role,
  });

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupportRequestsController],
      providers: [
        {
          provide: SupportRequestsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<SupportRequestsController>(
      SupportRequestsController,
    );
  });

  describe('findAll', () => {
    it('should call service.findAll with parsed query params', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      service.findAll.mockResolvedValue({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        data: [],
      });

      const result = await controller.findAll(
        req as any,
        '2',
        '5',
        'search',
        'Plumbing',
        SupportStatus.PENDING,
        'S001',
        'John Doe',
        '101',
        'Building A',
        '3',
        'title',
        'DESC',
      );

      expect(service.findAll).toHaveBeenCalledWith(
        {
          page: 2,
          limit: 5,
          search: 'search',
          category: 'Plumbing',
          status: SupportStatus.PENDING,
          studentCode: 'S001',
          studentName: 'John Doe',
          roomNumber: '101',
          buildingName: 'Building A',
          handledBy: 3,
          sortBy: 'title',
          sortOrder: 'DESC',
        },
        req.user,
      );
      expect(result.total).toBe(1);
    });

    it('should use default pagination when missing values', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      service.findAll.mockResolvedValue({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        data: [],
      });

      await controller.findAll(req as any, undefined, undefined);

      expect(service.findAll).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          search: undefined,
          category: undefined,
          status: undefined,
          studentCode: undefined,
          studentName: undefined,
          roomNumber: undefined,
          buildingName: undefined,
          handledBy: undefined,
          sortBy: undefined,
          sortOrder: undefined,
        },
        req.user,
      );
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with parsed id', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      service.findOne.mockResolvedValue({ id: 1 });

      const result = await controller.findOne('1', req as any);

      expect(service.findOne).toHaveBeenCalledWith(1, req.user);
      expect(result.id).toBe(1);
    });

    it('should throw BadRequestException for invalid id', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      await expect(controller.findOne('abc', req as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('create', () => {
    it('should call service.create with DTO and user', async () => {
      const req = { user: mockUser(3, UserRole.STUDENT) };
      const dto = {
        studentId: 1,
        roomId: 1,
        category: 'Plumbing',
        title: 'Leaky faucet',
        description: 'The faucet is leaking',
      };
      service.create.mockResolvedValue({ id: 1, title: 'Leaky faucet' });

      const result = await controller.create(dto as any, req as any);

      expect(service.create).toHaveBeenCalledWith(dto, req.user);
      expect(result.title).toBe('Leaky faucet');
    });
  });

  describe('update', () => {
    it('should call service.update with parsed id, DTO and user', async () => {
      const req = { user: mockUser(2, UserRole.MANAGER) };
      const dto = { reply: 'Fixed', status: SupportStatus.PROCESSING };
      service.update.mockResolvedValue({ id: 1, reply: 'Fixed' });

      const result = await controller.update('1', dto as any, req as any);

      expect(service.update).toHaveBeenCalledWith(1, dto, req.user);
      expect(result.reply).toBe('Fixed');
    });

    it('should throw BadRequestException for invalid id', async () => {
      const req = { user: mockUser(2, UserRole.MANAGER) };
      await expect(
        controller.update('abc', { reply: 'Fixed' } as any, req as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should call service.remove with parsed id and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      service.remove.mockResolvedValue({ message: 'Deleted' });

      const result = await controller.remove('1', req as any);

      expect(service.remove).toHaveBeenCalledWith(1, req.user);
      expect(result.message).toBe('Deleted');
    });

    it('should throw BadRequestException for invalid id', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      await expect(controller.remove('abc', req as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Roles metadata', () => {
    it('findAll should allow ADMIN, MANAGER, STUDENT', () => {
      const roles = Reflect.getMetadata(
        'roles',
        SupportRequestsController.prototype.findAll,
      );
      expect(roles).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.STUDENT,
      ]);
    });

    it('findOne should allow ADMIN, MANAGER, STUDENT', () => {
      const roles = Reflect.getMetadata(
        'roles',
        SupportRequestsController.prototype.findOne,
      );
      expect(roles).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.STUDENT,
      ]);
    });

    it('create should allow ADMIN, MANAGER, STUDENT', () => {
      const roles = Reflect.getMetadata(
        'roles',
        SupportRequestsController.prototype.create,
      );
      expect(roles).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.STUDENT,
      ]);
    });

    it('update should allow ADMIN, MANAGER', () => {
      const roles = Reflect.getMetadata(
        'roles',
        SupportRequestsController.prototype.update,
      );
      expect(roles).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });

    it('remove should allow ADMIN', () => {
      const roles = Reflect.getMetadata(
        'roles',
        SupportRequestsController.prototype.remove,
      );
      expect(roles).toEqual([UserRole.ADMIN]);
    });
  });
});
