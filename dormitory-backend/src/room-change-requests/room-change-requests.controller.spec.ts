import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RoomChangeRequestsController } from './room-change-requests.controller';
import { RoomChangeRequestsService } from './room-change-requests.service';
import { UserRole } from '../users/user.entity';
import { RoomChangeStatus } from '../common/enums/user-role.enum';

describe('RoomChangeRequestsController', () => {
  let controller: RoomChangeRequestsController;
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
      controllers: [RoomChangeRequestsController],
      providers: [
        {
          provide: RoomChangeRequestsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<RoomChangeRequestsController>(
      RoomChangeRequestsController,
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
        RoomChangeStatus.PENDING,
        '1',
        '1',
        '2',
        '1',
        '2',
        'id',
        'DESC',
      );

      expect(service.findAll).toHaveBeenCalledWith(
        {
          page: 2,
          limit: 5,
          search: 'search',
          status: RoomChangeStatus.PENDING,
          buildingId: 1,
          currentRoomId: 1,
          requestedRoomId: 2,
          studentId: 1,
          approvedBy: 2,
          sortBy: 'id',
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
          status: undefined,
          buildingId: undefined,
          currentRoomId: undefined,
          requestedRoomId: undefined,
          studentId: undefined,
          approvedBy: undefined,
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
        requestedRoomId: 2,
        reason: 'Need quieter room',
      };
      service.create.mockResolvedValue({ id: 1, reason: 'Need quieter room' });

      const result = await controller.create(dto as any, req as any);

      expect(service.create).toHaveBeenCalledWith(dto, req.user);
      expect(result.reason).toBe('Need quieter room');
    });
  });

  describe('update', () => {
    it('should call service.update with parsed id, DTO and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      const dto = { status: RoomChangeStatus.APPROVED, approvedBy: 1 };
      service.update.mockResolvedValue({
        id: 1,
        status: RoomChangeStatus.APPROVED,
      });

      const result = await controller.update('1', dto as any, req as any);

      expect(service.update).toHaveBeenCalledWith(1, dto, req.user);
      expect(result.status).toBe(RoomChangeStatus.APPROVED);
    });

    it('should throw BadRequestException for invalid id', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      await expect(
        controller.update(
          'abc',
          { status: RoomChangeStatus.APPROVED } as any,
          req as any,
        ),
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
});
