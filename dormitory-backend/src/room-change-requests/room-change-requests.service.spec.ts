import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RoomChangeRequestsService } from './room-change-requests.service';
import { RoomChangeRequestsRepository } from './room-change-requests.repository';
import { UserRole } from '../users/user.entity';
import {
  RoomChangeStatus,
  ContractStatus,
} from '../common/enums/user-role.enum';

const mockUser = (userId: number, role: UserRole) => ({
  userId,
  role,
});

describe('RoomChangeRequestsService', () => {
  let service: RoomChangeRequestsService;
  let repository: any;
  let dataSource: any;

  const mockStudent = {
    id: 1,
    userId: 3,
    studentCode: 'SV001',
    gender: 'Female',
    user: { id: 3, fullName: 'Student One' },
  };

  const mockCurrentRoom = {
    id: 1,
    roomNumber: 'A101',
    capacity: 4,
    gender: 'Female',
    building: { id: 1, buildingName: 'Building A' },
  };

  const mockRequestedRoom = {
    id: 2,
    roomNumber: 'A102',
    capacity: 4,
    gender: 'Female',
    building: { id: 1, buildingName: 'Building A' },
  };

  const mockContract = {
    id: 1,
    studentId: 1,
    roomId: 1,
    status: ContractStatus.ACTIVE,
    room: mockCurrentRoom,
  };

  const createMockRequest = () => ({
    id: 1,
    studentId: 1,
    currentRoomId: 1,
    requestedRoomId: 2,
    reason: 'Need quieter room',
    status: RoomChangeStatus.PENDING,
    approvedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    student: { ...mockStudent, user: { ...mockStudent.user } },
    currentRoom: {
      ...mockCurrentRoom,
      building: { ...mockCurrentRoom.building },
    },
    requestedRoom: {
      ...mockRequestedRoom,
      building: { ...mockRequestedRoom.building },
    },
    approver: null,
  });

  let mockRequest: any;

  const mockQueryBuilder = () => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest
        .fn()
        .mockImplementation(async () => [[mockRequest], 1]),
      getOne: jest.fn().mockImplementation(async () => mockRequest),
    };
    return qb;
  };

  beforeEach(async () => {
    repository = {
      findById: jest.fn().mockResolvedValue(mockRequest),
      hasPendingRequestForStudent: jest.fn().mockResolvedValue(false),
      managerHasAccessToRequest: jest.fn().mockResolvedValue(true),
      create: jest.fn((dto: any) => ({
        ...dto,
        id: 1,
        status: RoomChangeStatus.PENDING,
      })),
      save: jest.fn().mockImplementation(async (entity: any) => ({
        ...entity,
        id: entity.id ?? 1,
      })),
      delete: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder()),
    };

    dataSource = {
      manager: {
        findOne: jest.fn(async (entity: any, options: any) => {
          if (entity.name === 'Student') return mockStudent;
          if (entity.name === 'Contract') return mockContract;
          if (entity.name === 'Room') return mockRequestedRoom;
          return null;
        }),
        query: jest.fn(async () => [{ count: 0 }]),
      },
      transaction: jest.fn(async (callback: any) =>
        callback({
          getRepository: jest.fn().mockReturnValue({
            save: jest.fn(async (entity: any) => ({
              ...entity,
              id: entity.id ?? 1,
            })),
            findOne: jest.fn(async () => mockRequest),
          }),
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomChangeRequestsService,
        {
          provide: RoomChangeRequestsRepository,
          useValue: repository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    mockRequest = createMockRequest();
    repository.findById.mockResolvedValue(mockRequest);
    service = module.get<RoomChangeRequestsService>(RoomChangeRequestsService);
  });

  describe('findAll', () => {
    it('should return paginated data for admin', async () => {
      const result = await service.findAll(
        { page: 1, limit: 10 },
        mockUser(1, UserRole.ADMIN),
      );
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.data[0].id).toBe(1);
    });

    it('should return request for student owner in findOne', async () => {
      const result = await service.findOne(1, mockUser(3, UserRole.STUDENT));
      expect(result.id).toBe(1);
      expect(result.student?.user?.id).toBe(3);
    });

    it('should scope student results for STUDENT role', async () => {
      const qb = mockQueryBuilder();
      repository.createQueryBuilder.mockReturnValue(qb);
      dataSource.manager.findOne = jest.fn(async () => mockStudent);

      await service.findAll({}, mockUser(3, UserRole.STUDENT));

      expect(qb.andWhere).toHaveBeenCalledWith(
        'request.studentId = :studentId',
        { studentId: mockStudent.id },
      );
    });

    it('should scope manager results for MANAGER role', async () => {
      const qb = mockQueryBuilder();
      repository.createQueryBuilder.mockReturnValue(qb);
      await service.findAll({}, mockUser(2, UserRole.MANAGER));
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(currentBuilding.manager_id = :managerId OR requestedBuilding.manager_id = :managerId)',
        { managerId: 2 },
      );
    });

    it('should apply all supported filters in findAll', async () => {
      const qb = mockQueryBuilder();
      repository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        {
          search: 'SV',
          status: RoomChangeStatus.PENDING,
          buildingId: 1,
          currentRoomId: 1,
          requestedRoomId: 2,
          studentId: 1,
          approvedBy: 4,
          sortBy: 'id',
          sortOrder: 'DESC',
        },
        mockUser(1, UserRole.ADMIN),
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(student.studentCode)'),
        expect.objectContaining({ search: '%sv%' }),
      );
      expect(qb.andWhere).toHaveBeenCalledWith('request.status = :status', {
        status: RoomChangeStatus.PENDING,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(currentBuilding.id = :buildingId OR requestedBuilding.id = :buildingId)',
        { buildingId: 1 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'request.currentRoomId = :currentRoomId',
        { currentRoomId: 1 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'request.requestedRoomId = :requestedRoomId',
        { requestedRoomId: 2 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'request.studentId = :studentId',
        { studentId: 1 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'request.approvedBy = :approvedBy',
        { approvedBy: 4 },
      );
    });
  });

  describe('create', () => {
    it('should create a room change request successfully', async () => {
      repository.hasPendingRequestForStudent.mockResolvedValue(false);
      const result = await service.create(
        {
          studentId: 1,
          requestedRoomId: 2,
          reason: 'Need quieter room',
        },
        mockUser(3, UserRole.STUDENT),
      );
      expect(result.studentId).toBe(1);
      expect(result.requestedRoomId).toBe(2);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw when student tries to create a request for another student', async () => {
      await expect(
        service.create(
          { studentId: 2, requestedRoomId: 2, reason: 'Need change' },
          mockUser(3, UserRole.STUDENT),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw when student has no active contract', async () => {
      dataSource.manager.findOne = jest.fn(async (entity: any) => {
        if (entity.name === 'Student') return mockStudent;
        if (entity.name === 'Contract') return null;
        if (entity.name === 'Room') return mockRequestedRoom;
        return null;
      });

      await expect(
        service.create(
          { studentId: 1, requestedRoomId: 2, reason: 'Need quieter room' },
          mockUser(3, UserRole.STUDENT),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when requested room is not found', async () => {
      dataSource.manager.findOne = jest.fn(async (entity: any) => {
        if (entity.name === 'Student') return mockStudent;
        if (entity.name === 'Contract') return mockContract;
        if (entity.name === 'Room') return null;
        return null;
      });

      await expect(
        service.create(
          { studentId: 1, requestedRoomId: 999, reason: 'Need quieter room' },
          mockUser(3, UserRole.STUDENT),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when requested room gender does not match student', async () => {
      dataSource.manager.findOne = jest.fn(async (entity: any) => {
        if (entity.name === 'Student') return mockStudent;
        if (entity.name === 'Contract') return mockContract;
        if (entity.name === 'Room')
          return { ...mockRequestedRoom, gender: 'Male' };
        return null;
      });

      await expect(
        service.create(
          { studentId: 1, requestedRoomId: 2, reason: 'Need quieter room' },
          mockUser(3, UserRole.STUDENT),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when requested room has no available capacity', async () => {
      dataSource.manager.findOne = jest.fn(async (entity: any) => {
        if (entity.name === 'Student') return mockStudent;
        if (entity.name === 'Contract') return mockContract;
        if (entity.name === 'Room') return mockRequestedRoom;
        return null;
      });
      dataSource.manager.query = jest.fn(async () => [{ count: 4 }]);

      await expect(
        service.create(
          { studentId: 1, requestedRoomId: 2, reason: 'Need quieter room' },
          mockUser(3, UserRole.STUDENT),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when student already has a pending request', async () => {
      repository.hasPendingRequestForStudent.mockResolvedValue(true);

      await expect(
        service.create(
          { studentId: 1, requestedRoomId: 2, reason: 'Need quieter room' },
          mockUser(3, UserRole.STUDENT),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when student does not exist', async () => {
      dataSource.manager.findOne = jest.fn(async (entity: any) => null);
      await expect(
        service.create(
          { studentId: 999, requestedRoomId: 2, reason: 'Need quieter' },
          mockUser(3, UserRole.STUDENT),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should reject when request not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.update(
          999,
          { status: RoomChangeStatus.APPROVED, approvedBy: 1 },
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject modifying non-pending request', async () => {
      repository.findById.mockResolvedValue({
        ...mockRequest,
        status: RoomChangeStatus.APPROVED,
      });
      await expect(
        service.update(
          1,
          { reason: 'Still needs change' },
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject manager without access when updating', async () => {
      repository.findById.mockResolvedValue(mockRequest);
      repository.managerHasAccessToRequest.mockResolvedValue(false);
      await expect(
        service.update(
          1,
          { status: RoomChangeStatus.REJECTED, approvedBy: 2 },
          mockUser(2, UserRole.MANAGER),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject approving when active contract is missing', async () => {
      repository.findById.mockResolvedValue(mockRequest);
      dataSource.manager.findOne = jest.fn(async (entity: any) => {
        if (entity.name === 'Student') return mockStudent;
        if (entity.name === 'Contract') return null;
        if (entity.name === 'Room') return mockRequestedRoom;
        return null;
      });

      await expect(
        service.update(
          1,
          { status: RoomChangeStatus.APPROVED, approvedBy: 2 },
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject approving when current room mismatches active contract', async () => {
      repository.findById.mockResolvedValue(mockRequest);
      dataSource.manager.findOne = jest.fn(async (entity: any) => {
        if (entity.name === 'Student') return mockStudent;
        if (entity.name === 'Contract') return { ...mockContract, roomId: 99 };
        if (entity.name === 'Room') return mockRequestedRoom;
        return null;
      });

      await expect(
        service.update(
          1,
          { status: RoomChangeStatus.APPROVED, approvedBy: 2 },
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject approving when requested room is not found', async () => {
      repository.findById.mockResolvedValue(mockRequest);
      dataSource.manager.findOne = jest.fn(async (entity: any) => {
        if (entity.name === 'Student') return mockStudent;
        if (entity.name === 'Contract') return mockContract;
        if (entity.name === 'Room') return null;
        return null;
      });

      await expect(
        service.update(
          1,
          { status: RoomChangeStatus.APPROVED, approvedBy: 2 },
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject approving when requested room gender mismatches student', async () => {
      repository.findById.mockResolvedValue(mockRequest);
      dataSource.manager.findOne = jest.fn(async (entity: any) => {
        if (entity.name === 'Student') return mockStudent;
        if (entity.name === 'Contract') return mockContract;
        if (entity.name === 'Room')
          return { ...mockRequestedRoom, gender: 'Male' };
        return null;
      });

      await expect(
        service.update(
          1,
          { status: RoomChangeStatus.APPROVED, approvedBy: 2 },
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject approving when requested room is full', async () => {
      repository.findById.mockResolvedValue(mockRequest);
      dataSource.manager.findOne = jest.fn(async (entity: any) => {
        if (entity.name === 'Student') return mockStudent;
        if (entity.name === 'Contract') return mockContract;
        if (entity.name === 'Room') return mockRequestedRoom;
        return null;
      });
      dataSource.manager.query = jest.fn(async () => [{ count: 4 }]);

      await expect(
        service.update(
          1,
          { status: RoomChangeStatus.APPROVED, approvedBy: 2 },
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject deleting non-pending request', async () => {
      repository.findById.mockResolvedValue({
        ...mockRequest,
        status: RoomChangeStatus.APPROVED,
      });
      await expect(
        service.remove(1, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non-admin deleting a request', async () => {
      repository.findById.mockResolvedValue(mockRequest);
      await expect(
        service.remove(1, mockUser(3, UserRole.STUDENT)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete pending request for admin', async () => {
      repository.findById.mockResolvedValue(mockRequest);
      const result = await service.remove(1, mockUser(1, UserRole.ADMIN));
      expect(result).toEqual({
        message: 'Room change request deleted successfully',
      });
      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should reject non-admin/non-manager update', async () => {
      await expect(
        service.update(
          1,
          { status: RoomChangeStatus.APPROVED, approvedBy: 2 },
          mockUser(3, UserRole.STUDENT),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when updating a missing request', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.update(
          999,
          { status: RoomChangeStatus.REJECTED, approvedBy: 2 },
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when updating a non-pending request', async () => {
      repository.findById.mockResolvedValue({
        ...mockRequest,
        status: RoomChangeStatus.APPROVED,
      });
      await expect(
        service.update(
          1,
          { status: RoomChangeStatus.REJECTED, approvedBy: 2 },
          mockUser(1, UserRole.ADMIN),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when manager has no access to update', async () => {
      repository.findById.mockResolvedValue(mockRequest);
      repository.managerHasAccessToRequest.mockResolvedValue(false);
      await expect(
        service.update(
          1,
          { status: RoomChangeStatus.APPROVED, approvedBy: 2 },
          mockUser(2, UserRole.MANAGER),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should approve a request successfully', async () => {
      repository.findById.mockResolvedValue(mockRequest);
      dataSource.manager.findOne = jest.fn(async (entity: any) => {
        if (entity.name === 'Contract') return mockContract;
        if (entity.name === 'Student') return mockStudent;
        if (entity.name === 'Room') return mockRequestedRoom;
        return null;
      });
      dataSource.manager.query = jest.fn(async () => [{ count: 0 }]);
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder());

      const result = await service.update(
        1,
        {
          status: RoomChangeStatus.APPROVED,
          approvedBy: 5,
          reason: 'Approved',
        },
        mockUser(1, UserRole.ADMIN),
      );

      expect(result.status).toBe(RoomChangeStatus.APPROVED);
      expect(result.approvedBy).toBe(5);
    });

    it('should reject a request successfully', async () => {
      repository.findById
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({
          ...mockRequest,
          status: RoomChangeStatus.REJECTED,
          approvedBy: 5,
        });
      repository.save.mockResolvedValue({
        ...mockRequest,
        status: RoomChangeStatus.REJECTED,
        approvedBy: 5,
      });

      const result = await service.update(
        1,
        {
          status: RoomChangeStatus.REJECTED,
          approvedBy: 5,
          reason: 'Denied',
        },
        mockUser(1, UserRole.ADMIN),
      );

      expect(result.status).toBe(RoomChangeStatus.REJECTED);
      expect(result.approvedBy).toBe(5);
    });

    it('should update reason only when status is omitted', async () => {
      repository.findById
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({
          ...mockRequest,
          reason: 'Updated reason',
        });
      repository.save.mockResolvedValue({
        ...mockRequest,
        reason: 'Updated reason',
      });

      const result = await service.update(
        1,
        { reason: 'Updated reason' },
        mockUser(1, UserRole.ADMIN),
      );

      expect(result.reason).toBe('Updated reason');
    });
  });

  describe('remove', () => {
    it('should delete request for admin', async () => {
      const result = await service.remove(1, mockUser(1, UserRole.ADMIN));
      expect(repository.delete).toHaveBeenCalledWith(1);
      expect(result.message).toContain('deleted');
    });

    it('should throw NotFoundException when removing a missing request', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.remove(999, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when removing a non-pending request', async () => {
      repository.findById.mockResolvedValue({
        ...mockRequest,
        status: RoomChangeStatus.APPROVED,
      });
      await expect(
        service.remove(1, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject delete for non-admin', async () => {
      await expect(
        service.remove(1, mockUser(2, UserRole.MANAGER)),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
