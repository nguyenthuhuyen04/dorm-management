import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoomsRepository } from './rooms.repository';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Building } from '../buildings/building.entity';
import { Gender, RoomStatus } from '../common/enums/user-role.enum';
import { UserRole } from '../users/user.entity';
import { Room } from './room.entity';

interface AuthenticatedUser {
  userId: number;
  role: UserRole;
}

interface FindRoomsQuery {
  page?: number;
  limit?: number;
  search?: string;
  buildingId?: number;
  status?: string;
  gender?: string;
  floor?: number;
  roomType?: string;
}

interface PublicRoomResponse {
  id: number;
  buildingId: number;
  roomNumber: string;
  floor: number;
  roomType: string | null;
  gender: Gender | null;
  capacity: number;
  roomFee: number;
  status: RoomStatus;
  createdAt: Date;
  building: {
    id: number;
    buildingName: string;
    gender: string;
  } | null;
  currentOccupancy: number;
  availableSlots: number;
}

@Injectable()
export class RoomsService {
  constructor(private readonly roomsRepository: RoomsRepository) {}

  async findAll(
    query: FindRoomsQuery,
    currentUser: AuthenticatedUser,
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    data: PublicRoomResponse[];
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.roomsRepository.createQueryBuilder('room');
    queryBuilder.leftJoinAndSelect('room.building', 'building');

    if (currentUser.role === UserRole.MANAGER) {
      queryBuilder.leftJoin('building.manager', 'manager');
      queryBuilder.andWhere('manager.id = :managerId', {
        managerId: currentUser.userId,
      });
    }

    if (currentUser.role === UserRole.STUDENT) {
      queryBuilder.leftJoin('room.contracts', 'contracts');
      queryBuilder.leftJoin('contracts.student', 'student');
      queryBuilder.andWhere('student.userId = :userId', {
        userId: currentUser.userId,
      });
    }

    if (query.search) {
      const search = `%${query.search}%`;
      queryBuilder.andWhere(
        '(LOWER(room.roomNumber) LIKE :search OR LOWER(room.roomType) LIKE :search OR LOWER(building.buildingName) LIKE :search)',
        { search },
      );
    }

    if (query.buildingId) {
      queryBuilder.andWhere('room.buildingId = :buildingId', {
        buildingId: query.buildingId,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('room.status = :status', { status: query.status });
    }

    if (query.gender) {
      queryBuilder.andWhere('room.gender = :gender', { gender: query.gender });
    }

    if (query.floor !== undefined) {
      queryBuilder.andWhere('room.floor = :floor', { floor: query.floor });
    }

    if (query.roomType) {
      queryBuilder.andWhere('LOWER(room.roomType) LIKE :roomType', {
        roomType: `%${query.roomType.toLowerCase()}%`,
      });
    }

    queryBuilder.orderBy('room.id', 'ASC').skip(skip).take(limit);

    const [rooms, total] = await queryBuilder.getManyAndCount();
    const data = await Promise.all(
      rooms.map((room) => this.toPublicRoom(room)),
    );

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: data.filter((item): item is PublicRoomResponse => item !== null),
    };
  }

  async findOne(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<PublicRoomResponse | null> {
    const room = await this.roomsRepository.findById(id);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (currentUser.role === UserRole.MANAGER) {
      if (!room.building || room.building.manager?.id !== currentUser.userId) {
        throw new ForbiddenException('Access denied');
      }
    }

    if (currentUser.role === UserRole.STUDENT) {
      const hasAccess = await this.roomsRepository.hasStudentAccessToRoom(
        id,
        currentUser.userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.toPublicRoom(room);
  }

  async create(
    createRoomDto: CreateRoomDto,
    currentUser?: AuthenticatedUser,
  ): Promise<PublicRoomResponse | null> {
    this.assertCreatePermission(currentUser);

    const existingRoom = await this.roomsRepository.findByBuildingAndRoomNumber(
      createRoomDto.building_id,
      createRoomDto.room_number,
    );
    if (existingRoom) {
      throw new ConflictException(
        'room_number already exists in this building',
      );
    }

    const building = await this.roomsRepository.manager.findOne(Building, {
      where: { id: createRoomDto.building_id },
      relations: ['manager'],
    });
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    if (currentUser?.role === UserRole.MANAGER) {
      if (!building.manager || building.manager.id !== currentUser.userId) {
        throw new ForbiddenException('Access denied');
      }
    }

    const roomGender: Gender | null =
      createRoomDto.gender ?? (building.gender as Gender);
    if (createRoomDto.gender && createRoomDto.gender !== building.gender) {
      throw new BadRequestException(
        `Room gender must match building gender (${building.gender})`,
      );
    }

    const room = this.roomsRepository.create({
      buildingId: createRoomDto.building_id,
      roomNumber: createRoomDto.room_number.trim(),
      floor: createRoomDto.floor,
      roomType: createRoomDto.room_type?.trim() ?? null,
      gender: roomGender,
      capacity: createRoomDto.capacity,
      roomFee: createRoomDto.room_fee,
      status: createRoomDto.status ?? RoomStatus.ACTIVE,
    }) as Room;

    const savedRoom = (await this.roomsRepository.save(room)) as Room;
    const reloadedRoom = await this.roomsRepository.findById(savedRoom.id);
    return this.toPublicRoom(reloadedRoom);
  }

  async update(
    id: number,
    updateRoomDto: UpdateRoomDto,
    currentUser?: AuthenticatedUser,
  ): Promise<PublicRoomResponse | null> {
    const room = await this.roomsRepository.findById(id);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    this.assertManagementPermission(room, currentUser);

    let buildingForValidation = room.building;

    if (updateRoomDto.building_id !== undefined) {
      const building = await this.roomsRepository.manager.findOne(Building, {
        where: { id: updateRoomDto.building_id },
        relations: ['manager'],
      });
      if (!building) {
        throw new NotFoundException('Building not found');
      }

      if (currentUser?.role === UserRole.MANAGER) {
        if (!building.manager || building.manager.id !== currentUser.userId) {
          throw new ForbiddenException('Access denied');
        }
      }

      room.buildingId = updateRoomDto.building_id;
      buildingForValidation = building;
    }

    if (updateRoomDto.room_number !== undefined) {
      const conflictRoom =
        await this.roomsRepository.findByBuildingAndRoomNumber(
          room.buildingId,
          updateRoomDto.room_number,
        );
      if (conflictRoom && conflictRoom.id !== id) {
        throw new ConflictException(
          'room_number already exists in this building',
        );
      }
      room.roomNumber = updateRoomDto.room_number.trim();
    }

    if (updateRoomDto.floor !== undefined) {
      room.floor = updateRoomDto.floor;
    }

    if (updateRoomDto.room_type !== undefined) {
      room.roomType = updateRoomDto.room_type?.trim() ?? null;
    }

    if (updateRoomDto.gender !== undefined) {
      room.gender = updateRoomDto.gender;
    }

    const effectiveGender =
      room.gender ?? buildingForValidation?.gender ?? null;
    if (
      effectiveGender !== null &&
      buildingForValidation?.gender &&
      effectiveGender !== buildingForValidation.gender
    ) {
      throw new BadRequestException(
        `Room gender must match building gender (${buildingForValidation.gender})`,
      );
    }

    if (updateRoomDto.capacity !== undefined) {
      if (updateRoomDto.capacity <= 0) {
        throw new BadRequestException('capacity must be greater than 0');
      }
      const currentOccupancy =
        await this.roomsRepository.getActiveOccupancy(id);
      if (updateRoomDto.capacity < currentOccupancy) {
        throw new BadRequestException(
          'Capacity cannot be less than current occupancy',
        );
      }
      room.capacity = updateRoomDto.capacity;
    }

    if (updateRoomDto.room_fee !== undefined) {
      room.roomFee = updateRoomDto.room_fee;
    }

    if (updateRoomDto.status !== undefined) {
      room.status = updateRoomDto.status;
    }

    await this.roomsRepository.save(room);
    const updatedRoom = await this.roomsRepository.findById(id);
    return this.toPublicRoom(updatedRoom);
  }

  async remove(
    id: number,
    currentUser?: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const room = await this.roomsRepository.findById(id);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    this.assertManagementPermission(room, currentUser);

    const activeContractCount =
      await this.roomsRepository.countActiveContracts(id);
    if (activeContractCount > 0) {
      throw new ConflictException('Cannot delete room with active contracts');
    }

    await this.roomsRepository.delete(id);
    return { message: 'Room deleted successfully' };
  }

  async getCurrentOccupancy(roomId: number): Promise<number> {
    return this.roomsRepository.getActiveOccupancy(roomId);
  }

  async getAvailableSlots(roomId: number): Promise<number> {
    const room = await this.findRoomOrThrow(roomId);
    const currentOccupancy = await this.getCurrentOccupancy(roomId);
    return Math.max(room.capacity - currentOccupancy, 0);
  }

  async canAssignStudent(roomId: number): Promise<boolean> {
    return (await this.getAvailableSlots(roomId)) > 0;
  }

  async validateCapacity(roomId: number): Promise<void> {
    if (!(await this.canAssignStudent(roomId))) {
      throw new BadRequestException('Room is full');
    }
  }

  private async findRoomOrThrow(roomId: number): Promise<Room> {
    const room = await this.roomsRepository.findById(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  private assertCreatePermission(currentUser?: AuthenticatedUser): void {
    if (!currentUser) {
      throw new ForbiddenException('Access denied');
    }

    if (
      currentUser.role !== UserRole.ADMIN &&
      currentUser.role !== UserRole.MANAGER
    ) {
      throw new ForbiddenException('Access denied');
    }
  }

  private assertManagementPermission(
    room: Room,
    currentUser?: AuthenticatedUser,
  ): void {
    if (!currentUser) {
      throw new ForbiddenException('Access denied');
    }

    if (currentUser.role === UserRole.STUDENT) {
      throw new ForbiddenException('Access denied');
    }

    if (currentUser.role === UserRole.MANAGER) {
      if (
        !room.building ||
        !room.building.manager ||
        room.building.manager.id !== currentUser.userId
      ) {
        throw new ForbiddenException('Access denied');
      }
    }
  }

  private async toPublicRoom(
    room: Room | null,
  ): Promise<PublicRoomResponse | null> {
    if (!room) {
      return null;
    }

    const currentOccupancy = await this.roomsRepository.getActiveOccupancy(
      room.id,
    );
    const availableSlots = Math.max(room.capacity - currentOccupancy, 0);

    return {
      id: room.id,
      buildingId: room.buildingId,
      roomNumber: room.roomNumber,
      floor: room.floor,
      roomType: room.roomType,
      gender: room.gender,
      capacity: room.capacity,
      roomFee: Number(room.roomFee),
      status: room.status,
      createdAt: room.createdAt,
      building: room.building
        ? {
            id: room.building.id,
            buildingName: room.building.buildingName,
            gender: room.building.gender,
          }
        : null,
      currentOccupancy,
      availableSlots,
    };
  }
}
