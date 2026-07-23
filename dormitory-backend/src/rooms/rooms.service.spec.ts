import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { UserRole } from '../users/user.entity';
import {
  ContractStatus,
  Gender,
  RoomStatus,
} from '../common/enums/user-role.enum';
import { Building } from '../buildings/building.entity';
import { Room } from './room.entity';

describe('RoomsService', () => {
  let service: RoomsService;
  let repository: any;
  let sampleRoom: Room;

  const createSampleRoom = (): Room =>
    ({
      id: 1,
      buildingId: 1,
      roomNumber: '101',
      floor: 1,
      roomType: 'Single',
      gender: Gender.MALE,
      capacity: 4,
      roomFee: 1000000,
      status: RoomStatus.ACTIVE,
      createdAt: new Date('2024-01-01'),
      building: {
        id: 1,
        buildingName: 'Building 1',
        gender: Gender.MALE,
        manager: { id: 1 },
      },
    }) as Room;

  function createQueryBuilderMock() {
    return {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[sampleRoom], 1]),
    };
  }

  beforeEach(() => {
    sampleRoom = createSampleRoom();
    repository = {
      createQueryBuilder: jest.fn(),
      findByBuildingAndRoomNumber: jest.fn(),
      manager: {
        findOne: jest.fn(),
      },
      create: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      getActiveOccupancy: jest.fn(),
      countActiveContracts: jest.fn(),
      delete: jest.fn(),
      hasStudentAccessToRoom: jest.fn(),
    };

    service = new RoomsService(repository);
  });

  describe('findAll', () => {
    it('returns paginated rooms with filters and default pagination', async () => {
      const queryBuilder = createQueryBuilderMock();
      repository.createQueryBuilder.mockReturnValue(queryBuilder);
      repository.getActiveOccupancy.mockResolvedValue(2);

      const result = await service.findAll(
        {
          page: 0,
          limit: 0,
          search: '101',
          buildingId: 1,
          status: 'ACTIVE',
          gender: 'Male',
          floor: 1,
          roomType: 'Single',
        },
        { userId: 99, role: UserRole.ADMIN },
      );

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('room');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'room.building',
        'building',
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(room.roomNumber)'),
        expect.objectContaining({ search: '%101%' }),
      );
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(1);
      expect(result.data[0].currentOccupancy).toBe(2);
      expect(result.data[0].availableSlots).toBe(2);
    });

    it('applies manager scoping when user is manager', async () => {
      const queryBuilder = createQueryBuilderMock();
      repository.createQueryBuilder.mockReturnValue(queryBuilder);
      repository.getActiveOccupancy.mockResolvedValue(0);

      await service.findAll(
        { page: 1, limit: 5 },
        { userId: 5, role: UserRole.MANAGER },
      );

      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'building.manager',
        'manager',
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'manager.id = :managerId',
        { managerId: 5 },
      );
    });

    it('applies student scoping when user is student', async () => {
      const queryBuilder = createQueryBuilderMock();
      repository.createQueryBuilder.mockReturnValue(queryBuilder);
      repository.getActiveOccupancy.mockResolvedValue(0);

      await service.findAll(
        { page: 1, limit: 5 },
        { userId: 12, role: UserRole.STUDENT },
      );

      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'room.contracts',
        'contracts',
      );
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'contracts.student',
        'student',
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'student.userId = :userId',
        { userId: 12 },
      );
    });

    it('filters out null rooms when room conversion returns null', async () => {
      const queryBuilder = createQueryBuilderMock();
      queryBuilder.getManyAndCount.mockResolvedValue([[null], 1]);
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll(
        { page: 1, limit: 5 },
        { userId: 99, role: UserRole.ADMIN },
      );

      expect(result.data).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when room does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.findOne(999, { userId: 1, role: UserRole.ADMIN }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for manager without access', async () => {
      repository.findById.mockResolvedValue({
        ...sampleRoom,
        building: { ...sampleRoom.building, manager: { id: 2 } },
      });
      await expect(
        service.findOne(1, { userId: 1, role: UserRole.MANAGER }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for student without contract access', async () => {
      repository.findById.mockResolvedValue(sampleRoom);
      repository.hasStudentAccessToRoom.mockResolvedValue(false);

      await expect(
        service.findOne(1, { userId: 8, role: UserRole.STUDENT }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns public room for admin', async () => {
      repository.findById.mockResolvedValue(sampleRoom);
      repository.getActiveOccupancy.mockResolvedValue(1);

      const result = await service.findOne(1, {
        userId: 1,
        role: UserRole.ADMIN,
      });

      expect(result).toMatchObject({
        id: 1,
        buildingId: 1,
        roomNumber: '101',
        currentOccupancy: 1,
        availableSlots: 3,
      });
    });
  });

  describe('create', () => {
    const createDto = {
      building_id: 1,
      room_number: '101',
      floor: 2,
      capacity: 4,
      room_fee: 1100000,
      status: RoomStatus.ACTIVE,
      gender: Gender.MALE,
    } as any;

    it('throws ForbiddenException when no user is provided', async () => {
      await expect(service.create(createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ConflictException when room number already exists in building', async () => {
      repository.findByBuildingAndRoomNumber.mockResolvedValue(sampleRoom);
      await expect(
        service.create(createDto, { userId: 1, role: UserRole.ADMIN }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when building does not exist', async () => {
      repository.findByBuildingAndRoomNumber.mockResolvedValue(null);
      repository.manager.findOne.mockResolvedValue(null);

      await expect(
        service.create(createDto, { userId: 1, role: UserRole.ADMIN }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when gender does not match building gender', async () => {
      repository.findByBuildingAndRoomNumber.mockResolvedValue(null);
      repository.manager.findOne.mockResolvedValue({
        id: 1,
        gender: Gender.FEMALE,
        manager: { id: 1 },
      } as Building);

      await expect(
        service.create(
          { ...createDto, gender: Gender.MALE },
          { userId: 1, role: UserRole.ADMIN },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a new room successfully', async () => {
      const savedRoom = { ...sampleRoom, id: 1, roomNumber: '101' };
      repository.findByBuildingAndRoomNumber.mockResolvedValue(null);
      repository.manager.findOne.mockResolvedValue({
        id: 1,
        gender: Gender.MALE,
        manager: { id: 1 },
      } as Building);
      repository.create.mockReturnValue(savedRoom);
      repository.save.mockResolvedValue(savedRoom);
      repository.findById.mockResolvedValue(savedRoom);
      repository.getActiveOccupancy.mockResolvedValue(0);

      const result = await service.create(createDto, {
        userId: 1,
        role: UserRole.ADMIN,
      });

      expect(repository.create).toHaveBeenCalledWith({
        buildingId: 1,
        roomNumber: '101',
        floor: 2,
        roomType: null,
        gender: Gender.MALE,
        capacity: 4,
        roomFee: 1100000,
        status: RoomStatus.ACTIVE,
      });
      expect(result).toMatchObject({
        roomNumber: '101',
        capacity: 4,
        currentOccupancy: 0,
        availableSlots: 4,
      });
    });
  });

  describe('update', () => {
    it('throws NotFoundException when room does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.update(1, { room_fee: 12345 } as any, {
          userId: 1,
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when manager does not manage the room', async () => {
      repository.findById.mockResolvedValue({
        ...sampleRoom,
        building: { ...sampleRoom.building, manager: { id: 2 } },
      });

      await expect(
        service.update(1, { room_fee: 12345 } as any, {
          userId: 1,
          role: UserRole.MANAGER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when updated room number conflicts', async () => {
      repository.findById.mockResolvedValue(sampleRoom);
      repository.findByBuildingAndRoomNumber.mockResolvedValue({ id: 2 });

      await expect(
        service.update(1, { room_number: '102' } as any, {
          userId: 1,
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when updated gender conflicts with building gender', async () => {
      repository.findById.mockResolvedValue(sampleRoom);
      repository.findByBuildingAndRoomNumber.mockResolvedValue(null);

      await expect(
        service.update(1, { gender: Gender.FEMALE } as any, {
          userId: 1,
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when capacity is invalid', async () => {
      repository.findById.mockResolvedValue(sampleRoom);
      await expect(
        service.update(1, { capacity: 0 } as any, {
          userId: 1,
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when capacity is less than occupancy', async () => {
      repository.findById.mockResolvedValue(sampleRoom);
      repository.getActiveOccupancy.mockResolvedValue(3);

      await expect(
        service.update(1, { capacity: 2 } as any, {
          userId: 1,
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when updating room building to a missing building', async () => {
      repository.findById.mockResolvedValue(sampleRoom);
      repository.manager.findOne.mockResolvedValue(null);

      await expect(
        service.update(1, { building_id: 2 } as any, {
          userId: 1,
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when manager does not own the new building on update', async () => {
      repository.findById.mockResolvedValue(sampleRoom);
      repository.manager.findOne.mockResolvedValue({
        id: 2,
        gender: Gender.MALE,
        manager: { id: 2 },
      } as Building);

      await expect(
        service.update(1, { building_id: 2 } as any, {
          userId: 1,
          role: UserRole.MANAGER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates room type to null and status when room_type is blank', async () => {
      const updatedRoom = {
        ...sampleRoom,
        roomType: '',
        status: RoomStatus.MAINTENANCE,
      };
      repository.findById.mockResolvedValue(sampleRoom);
      repository.findByBuildingAndRoomNumber.mockResolvedValue(null);
      repository.getActiveOccupancy.mockResolvedValue(0);
      repository.save.mockResolvedValue(updatedRoom);
      repository.findById.mockResolvedValue(updatedRoom);

      const result = await service.update(
        1,
        { room_type: '  ', status: RoomStatus.MAINTENANCE } as any,
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(result).not.toBeNull();
      expect(result?.roomType).toBe('');
      expect(result?.status).toBe(RoomStatus.MAINTENANCE);
    });

    it('updates a room successfully', async () => {
      const updatedRoom = {
        ...sampleRoom,
        roomFee: 2200000,
        floor: 3,
        capacity: 5,
      };
      repository.findById.mockResolvedValue(sampleRoom);
      repository.findByBuildingAndRoomNumber.mockResolvedValue(null);
      repository.getActiveOccupancy.mockResolvedValue(1);
      repository.save.mockResolvedValue(updatedRoom);
      repository.findById.mockResolvedValue(updatedRoom);

      const result = await service.update(
        1,
        { room_fee: 2200000, floor: 3, capacity: 5 } as any,
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(result).toMatchObject({
        id: 1,
        floor: 3,
        capacity: 5,
        roomFee: 2200000,
      });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when room does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.remove(1, { userId: 1, role: UserRole.ADMIN }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when there is an active contract', async () => {
      repository.findById.mockResolvedValue(sampleRoom);
      repository.countActiveContracts.mockResolvedValue(2);

      await expect(
        service.remove(1, { userId: 1, role: UserRole.ADMIN }),
      ).rejects.toThrow(ConflictException);
    });

    it('deletes a room successfully when no active contracts exist', async () => {
      repository.findById.mockResolvedValue(sampleRoom);
      repository.countActiveContracts.mockResolvedValue(0);

      const result = await service.remove(1, {
        userId: 1,
        role: UserRole.ADMIN,
      });

      expect(repository.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: 'Room deleted successfully' });
    });
  });

  describe('occupancy helpers', () => {
    it('returns occupancy, available slots, and assignment validity', async () => {
      repository.findById.mockResolvedValue(sampleRoom);
      repository.getActiveOccupancy.mockResolvedValue(2);

      await expect(service.getCurrentOccupancy(1)).resolves.toBe(2);
      await expect(service.getAvailableSlots(1)).resolves.toBe(2);
      await expect(service.canAssignStudent(1)).resolves.toBe(true);
    });

    it('throws BadRequestException when room is full', async () => {
      repository.findById.mockResolvedValue(sampleRoom);
      repository.getActiveOccupancy.mockResolvedValue(4);

      await expect(service.validateCapacity(1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when getting available slots for a missing room', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.getAvailableSlots(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
