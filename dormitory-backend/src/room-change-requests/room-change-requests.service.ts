import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RoomChangeRequestsRepository } from './room-change-requests.repository';
import { CreateRoomChangeRequestDto } from './dto/create-room-change-request.dto';
import { UpdateRoomChangeRequestDto } from './dto/update-room-change-request.dto';
import { RoomChangeRequest } from './room-change-request.entity';
import { Student } from '../students/student.entity';
import { Room } from '../rooms/room.entity';
import { Contract } from '../contracts/contract.entity';
import { UserRole } from '../users/user.entity';
import {
  ContractStatus,
  RoomChangeStatus,
} from '../common/enums/user-role.enum';

interface AuthenticatedUser {
  userId: number;
  role: UserRole;
}

interface FindRoomChangeRequestsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: RoomChangeStatus;
  buildingId?: number;
  currentRoomId?: number;
  requestedRoomId?: number;
  studentId?: number;
  approvedBy?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface RoomChangeRequestResponse {
  id: number;
  studentId: number;
  currentRoomId: number;
  requestedRoomId: number;
  reason: string;
  status: RoomChangeStatus;
  approvedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
  student: {
    id: number;
    studentCode: string;
    user: {
      id: number;
      fullName: string;
    } | null;
  } | null;
  currentRoom: {
    id: number;
    roomNumber: string;
    building: {
      id: number;
      buildingName: string;
    } | null;
  } | null;
  requestedRoom: {
    id: number;
    roomNumber: string;
    building: {
      id: number;
      buildingName: string;
    } | null;
  } | null;
  approver: {
    id: number;
    fullName: string;
  } | null;
}

export interface PaginatedRoomChangeRequestsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: RoomChangeRequestResponse[];
}

@Injectable()
export class RoomChangeRequestsService {
  constructor(
    private readonly roomChangeRequestsRepository: RoomChangeRequestsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  private toResponse(request: RoomChangeRequest): RoomChangeRequestResponse {
    return {
      id: request.id,
      studentId: request.studentId,
      currentRoomId: request.currentRoomId,
      requestedRoomId: request.requestedRoomId,
      reason: request.reason,
      status: request.status,
      approvedBy: request.approvedBy,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      student: request.student
        ? {
            id: request.student.id,
            studentCode: request.student.studentCode,
            user: request.student.user
              ? {
                  id: request.student.user.id,
                  fullName: request.student.user.fullName,
                }
              : null,
          }
        : null,
      currentRoom: request.currentRoom
        ? {
            id: request.currentRoom.id,
            roomNumber: request.currentRoom.roomNumber,
            building: request.currentRoom.building
              ? {
                  id: request.currentRoom.building.id,
                  buildingName: request.currentRoom.building.buildingName,
                }
              : null,
          }
        : null,
      requestedRoom: request.requestedRoom
        ? {
            id: request.requestedRoom.id,
            roomNumber: request.requestedRoom.roomNumber,
            building: request.requestedRoom.building
              ? {
                  id: request.requestedRoom.building.id,
                  buildingName: request.requestedRoom.building.buildingName,
                }
              : null,
          }
        : null,
      approver: request.approver
        ? {
            id: request.approver.id,
            fullName: request.approver.fullName,
          }
        : null,
    };
  }

  private async getActiveContract(studentId: number): Promise<Contract | null> {
    return this.dataSource.manager.findOne(Contract, {
      where: { studentId, status: ContractStatus.ACTIVE },
      relations: ['room'],
    });
  }

  private async getRoom(roomId: number): Promise<Room | null> {
    return this.dataSource.manager.findOne(Room, {
      where: { id: roomId },
      relations: ['building'],
    });
  }

  private async getStudent(studentId: number): Promise<Student | null> {
    return this.dataSource.manager.findOne(Student, {
      where: { id: studentId },
      relations: ['user'],
    });
  }

  async findAll(
    query: FindRoomChangeRequestsQuery,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedRoomChangeRequestsResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const qb = this.roomChangeRequestsRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('request.currentRoom', 'currentRoom')
      .leftJoinAndSelect('currentRoom.building', 'currentBuilding')
      .leftJoinAndSelect('request.requestedRoom', 'requestedRoom')
      .leftJoinAndSelect('requestedRoom.building', 'requestedBuilding')
      .leftJoinAndSelect('request.approver', 'approver');

    if (currentUser.role === UserRole.STUDENT) {
      const student = await this.dataSource.manager.findOne(Student, {
        where: { userId: currentUser.userId },
      });
      if (!student) {
        throw new NotFoundException('Student not found');
      }
      qb.andWhere('request.studentId = :studentId', {
        studentId: student.id,
      });
    } else if (currentUser.role === UserRole.MANAGER) {
      qb.andWhere(
        '(currentBuilding.manager_id = :managerId OR requestedBuilding.manager_id = :managerId)',
        {
          managerId: currentUser.userId,
        },
      );
    }

    if (query.search) {
      const search = `%${query.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(student.studentCode) LIKE :search OR LOWER(studentUser.fullName) LIKE :search OR LOWER(currentRoom.roomNumber) LIKE :search OR LOWER(requestedRoom.roomNumber) LIKE :search OR LOWER(currentBuilding.buildingName) LIKE :search OR LOWER(requestedBuilding.buildingName) LIKE :search OR LOWER(request.reason) LIKE :search)',
        { search },
      );
    }

    if (query.status) {
      qb.andWhere('request.status = :status', { status: query.status });
    }

    if (query.buildingId) {
      qb.andWhere(
        '(currentBuilding.id = :buildingId OR requestedBuilding.id = :buildingId)',
        { buildingId: query.buildingId },
      );
    }

    if (query.currentRoomId) {
      qb.andWhere('request.currentRoomId = :currentRoomId', {
        currentRoomId: query.currentRoomId,
      });
    }

    if (query.requestedRoomId) {
      qb.andWhere('request.requestedRoomId = :requestedRoomId', {
        requestedRoomId: query.requestedRoomId,
      });
    }

    if (query.studentId) {
      qb.andWhere('request.studentId = :studentId', {
        studentId: query.studentId,
      });
    }

    if (query.approvedBy) {
      qb.andWhere('request.approvedBy = :approvedBy', {
        approvedBy: query.approvedBy,
      });
    }

    const allowedSortBy = new Set(['id', 'status', 'createdAt', 'updatedAt']);
    const sortBy = allowedSortBy.has(query.sortBy ?? '')
      ? query.sortBy
      : 'createdAt';
    const sortOrder = query.sortOrder === 'DESC' ? 'DESC' : 'ASC';
    qb.orderBy(`request.${sortBy}`, sortOrder);

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: data.map((request) => this.toResponse(request)),
    };
  }

  async findOne(id: number, currentUser: AuthenticatedUser) {
    const request = await this.roomChangeRequestsRepository.findById(id);
    if (!request) {
      throw new NotFoundException('Room change request not found');
    }

    if (currentUser.role === UserRole.STUDENT) {
      const student = await this.dataSource.manager.findOne(Student, {
        where: { userId: currentUser.userId },
      });
      if (!student || student.id !== request.studentId) {
        throw new ForbiddenException('Access denied');
      }
    } else if (currentUser.role === UserRole.MANAGER) {
      const hasAccess =
        await this.roomChangeRequestsRepository.managerHasAccessToRequest(
          id,
          currentUser.userId,
        );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.toResponse(request);
  }

  async create(
    createRoomChangeRequestDto: CreateRoomChangeRequestDto,
    currentUser: AuthenticatedUser,
  ): Promise<RoomChangeRequestResponse> {
    const student = await this.getStudent(createRoomChangeRequestDto.studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (currentUser.role === UserRole.STUDENT) {
      const currentStudent = await this.dataSource.manager.findOne(Student, {
        where: { userId: currentUser.userId },
      });
      if (
        !currentStudent ||
        currentStudent.id !== createRoomChangeRequestDto.studentId
      ) {
        throw new ForbiddenException(
          'Students can only create requests for themselves',
        );
      }
    }

    const contract = await this.getActiveContract(student.id);
    if (!contract) {
      throw new BadRequestException('Student does not have an active contract');
    }

    if (contract.roomId === createRoomChangeRequestDto.requestedRoomId) {
      throw new BadRequestException(
        'Requested room must be different from current room',
      );
    }

    const requestedRoom = await this.getRoom(
      createRoomChangeRequestDto.requestedRoomId,
    );
    if (!requestedRoom) {
      throw new NotFoundException('Requested room not found');
    }

    if (
      requestedRoom.gender &&
      student.gender &&
      requestedRoom.gender !== student.gender
    ) {
      throw new BadRequestException(
        'Requested room gender must match student gender',
      );
    }

    const requestedRoomOccupancy = await this.dataSource.manager.query(
      'SELECT COUNT(*) AS count FROM contracts WHERE room_id = ? AND status = ?',
      [requestedRoom.id, ContractStatus.ACTIVE],
    );
    const currentOccupancy = Number(requestedRoomOccupancy?.[0]?.count ?? 0);
    if (currentOccupancy >= requestedRoom.capacity) {
      throw new BadRequestException('Requested room has no available capacity');
    }

    const hasPendingRequest =
      await this.roomChangeRequestsRepository.hasPendingRequestForStudent(
        student.id,
      );
    if (hasPendingRequest) {
      throw new BadRequestException(
        'Student already has a pending room change request',
      );
    }

    const request = this.roomChangeRequestsRepository.create({
      studentId: student.id,
      currentRoomId: contract.roomId,
      requestedRoomId: requestedRoom.id,
      reason: createRoomChangeRequestDto.reason,
      status: RoomChangeStatus.PENDING,
      approvedBy: null,
    });

    const created = await this.roomChangeRequestsRepository.save(request);
    const createdRequest = await this.roomChangeRequestsRepository.findById(
      created.id,
    );
    if (!createdRequest) {
      throw new NotFoundException(
        'Room change request not found after creation',
      );
    }
    return this.toResponse(createdRequest);
  }

  async update(
    id: number,
    updateRoomChangeRequestDto: UpdateRoomChangeRequestDto,
    currentUser: AuthenticatedUser,
  ): Promise<RoomChangeRequestResponse> {
    const request = await this.roomChangeRequestsRepository.findById(id);
    if (!request) {
      throw new NotFoundException('Room change request not found');
    }

    if (request.status !== RoomChangeStatus.PENDING) {
      throw new BadRequestException(
        'Cannot modify a request that is already approved or rejected',
      );
    }

    if ([UserRole.ADMIN, UserRole.MANAGER].includes(currentUser.role)) {
      if (currentUser.role === UserRole.MANAGER) {
        const hasAccess =
          await this.roomChangeRequestsRepository.managerHasAccessToRequest(
            id,
            currentUser.userId,
          );
        if (!hasAccess) {
          throw new ForbiddenException('Access denied');
        }
      }

      if (updateRoomChangeRequestDto.status) {
        if (updateRoomChangeRequestDto.status === RoomChangeStatus.APPROVED) {
          const contract = await this.getActiveContract(request.studentId);
          if (!contract) {
            throw new BadRequestException(
              'Student does not have an active contract',
            );
          }

          if (contract.roomId !== request.currentRoomId) {
            throw new BadRequestException(
              'Current room does not match student active contract',
            );
          }

          const requestedRoom = await this.getRoom(request.requestedRoomId);
          if (!requestedRoom) {
            throw new NotFoundException('Requested room not found');
          }

          if (
            requestedRoom.gender &&
            request.student.gender &&
            requestedRoom.gender !== request.student.gender
          ) {
            throw new BadRequestException(
              'Requested room gender must match student gender',
            );
          }

          const requestedRoomOccupancy = await this.dataSource.manager.query(
            'SELECT COUNT(*) AS count FROM contracts WHERE room_id = ? AND status = ?',
            [requestedRoom.id, ContractStatus.ACTIVE],
          );
          const currentOccupancy = Number(
            requestedRoomOccupancy?.[0]?.count ?? 0,
          );
          if (currentOccupancy >= requestedRoom.capacity) {
            throw new BadRequestException(
              'Requested room has no available capacity',
            );
          }

          await this.dataSource.transaction(async (manager) => {
            const contractRepository = manager.getRepository(Contract);
            contract.roomId = requestedRoom.id;
            await contractRepository.save(contract);

            const requestRepository = manager.getRepository(RoomChangeRequest);
            request.status = RoomChangeStatus.APPROVED;
            request.approvedBy =
              updateRoomChangeRequestDto.approvedBy ?? currentUser.userId;
            if (updateRoomChangeRequestDto.reason) {
              request.reason = updateRoomChangeRequestDto.reason;
            }
            await requestRepository.save(request);
          });
        } else if (
          updateRoomChangeRequestDto.status === RoomChangeStatus.REJECTED
        ) {
          request.status = RoomChangeStatus.REJECTED;
          request.approvedBy =
            updateRoomChangeRequestDto.approvedBy ?? currentUser.userId;
          if (updateRoomChangeRequestDto.reason) {
            request.reason = updateRoomChangeRequestDto.reason;
          }
          await this.roomChangeRequestsRepository.save(request);
        }
      } else {
        if (updateRoomChangeRequestDto.reason) {
          request.reason = updateRoomChangeRequestDto.reason;
          await this.roomChangeRequestsRepository.save(request);
        }
      }
    } else {
      throw new ForbiddenException('Access denied');
    }

    const updatedRequest = await this.roomChangeRequestsRepository.findById(
      request.id,
    );
    if (!updatedRequest) {
      throw new NotFoundException('Room change request not found after update');
    }
    return this.toResponse(updatedRequest);
  }

  async remove(id: number, currentUser: AuthenticatedUser) {
    const request = await this.roomChangeRequestsRepository.findById(id);
    if (!request) {
      throw new NotFoundException('Room change request not found');
    }

    if (request.status !== RoomChangeStatus.PENDING) {
      throw new BadRequestException(
        'Cannot delete a request that is already approved or rejected',
      );
    }

    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    await this.roomChangeRequestsRepository.delete(id);
    return { message: 'Room change request deleted successfully' };
  }
}
