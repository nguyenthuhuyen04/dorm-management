import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ContractsRepository } from './contracts.repository';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { Contract } from './contract.entity';
import { Student } from '../students/student.entity';
import { Room } from '../rooms/room.entity';
import { Building } from '../buildings/building.entity';
import { User, UserRole } from '../users/user.entity';
import { ContractStatus } from '../common/enums/user-role.enum';

interface AuthenticatedUser {
  userId: number;
  role: UserRole;
}

interface FindContractsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  building?: string;
  room?: string;
  student?: string;
  manager?: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface ContractResponse {
  id: number;
  contractCode: string;
  studentId: number;
  roomId: number;
  createdBy: number;
  startDate: Date;
  endDate: Date;
  deposit: number;
  status: string;
  createdAt: Date;
  student: {
    id: number;
    studentCode: string;
    gender: string | null;
    user: {
      id: number;
      fullName: string;
    } | null;
  } | null;
  room: {
    id: number;
    roomNumber: string;
    roomFee: number;
    building: {
      id: number;
      buildingName: string;
    } | null;
  } | null;
  creator: {
    id: number;
    fullName: string;
  } | null;
}

interface PaginatedContractsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: ContractResponse[];
}

@Injectable()
export class ContractsService {
  constructor(
    private readonly contractsRepository: ContractsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  private toContractResponse(contract: Contract): ContractResponse {
    return {
      id: contract.id,
      contractCode: contract.contractCode,
      studentId: contract.studentId,
      roomId: contract.roomId,
      createdBy: contract.createdBy,
      startDate: contract.startDate,
      endDate: contract.endDate,
      deposit: Number(contract.deposit),
      status: contract.status,
      createdAt: contract.createdAt,
      student: contract.student
        ? {
            id: contract.student.id,
            studentCode: contract.student.studentCode,
            gender: contract.student.gender ?? null,
            user: contract.student.user
              ? {
                  id: contract.student.user.id,
                  fullName: contract.student.user.fullName,
                }
              : null,
          }
        : null,
      room: contract.room
        ? {
            id: contract.room.id,
            roomNumber: contract.room.roomNumber,
            roomFee: Number(contract.room.roomFee),
            building: contract.room.building
              ? {
                  id: contract.room.building.id,
                  buildingName: contract.room.building.buildingName,
                }
              : null,
          }
        : null,
      creator: contract.creator
        ? {
            id: contract.creator.id,
            fullName: contract.creator.fullName,
          }
        : null,
    };
  }

  async findAll(
    query: FindContractsQuery,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedContractsResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.contractsRepository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('contract.room', 'room')
      .leftJoinAndSelect('room.building', 'building')
      .leftJoinAndSelect('contract.creator', 'creator');

    // Role-based scoping
    if (currentUser.role === UserRole.STUDENT) {
      queryBuilder.andWhere('student.userId = :userId', {
        userId: currentUser.userId,
      });
    } else if (currentUser.role === UserRole.MANAGER) {
      queryBuilder.andWhere('building.manager_id = :managerId', {
        managerId: currentUser.userId,
      });
    }

    // Search
    if (query.search) {
      const search = `%${query.search.toLowerCase()}%`;
      queryBuilder.andWhere(
        '(LOWER(contract.contractCode) LIKE :search OR LOWER(student.studentCode) LIKE :search OR LOWER(studentUser.fullName) LIKE :search OR LOWER(room.roomNumber) LIKE :search OR LOWER(building.buildingName) LIKE :search)',
        { search },
      );
    }

    // Filters
    if (query.status) {
      queryBuilder.andWhere('contract.status = :status', {
        status: query.status,
      });
    }

    if (query.building) {
      queryBuilder.andWhere('LOWER(building.buildingName) LIKE :building', {
        building: `%${query.building.toLowerCase()}%`,
      });
    }

    if (query.room) {
      queryBuilder.andWhere('LOWER(room.roomNumber) LIKE :room', {
        room: `%${query.room.toLowerCase()}%`,
      });
    }

    if (query.student) {
      queryBuilder.andWhere(
        '(LOWER(student.studentCode) LIKE :student OR LOWER(studentUser.fullName) LIKE :student)',
        { student: `%${query.student.toLowerCase()}%` },
      );
    }

    if (query.manager) {
      queryBuilder.andWhere('LOWER(creator.fullName) LIKE :manager', {
        manager: `%${query.manager.toLowerCase()}%`,
      });
    }

    if (query.start_date) {
      queryBuilder.andWhere('contract.startDate >= :startDate', {
        startDate: query.start_date,
      });
    }

    if (query.end_date) {
      queryBuilder.andWhere('contract.endDate <= :endDate', {
        endDate: query.end_date,
      });
    }

    if (query.created_at) {
      queryBuilder.andWhere('DATE(contract.createdAt) = :createdAt', {
        createdAt: query.created_at,
      });
    }

    // Sorting
    const allowedSortBy = new Set([
      'id',
      'contractCode',
      'startDate',
      'endDate',
      'deposit',
      'status',
      'createdAt',
    ]);
    const sortBy = allowedSortBy.has(query.sortBy ?? '')
      ? (query.sortBy as string)
      : 'id';
    const sortOrder = query.sortOrder === 'DESC' ? 'DESC' : 'ASC';
    queryBuilder.orderBy(`contract.${sortBy}`, sortOrder);

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      data: data.map((contract) => this.toContractResponse(contract)),
    };
  }

  async findOne(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<ContractResponse> {
    const contract = await this.contractsRepository.findById(id);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Role-based access
    if (currentUser.role === UserRole.STUDENT) {
      if (!contract.student || contract.student.userId !== currentUser.userId) {
        throw new ForbiddenException('Access denied');
      }
    } else if (currentUser.role === UserRole.MANAGER) {
      const hasAccess = await this.contractsRepository.managerHasContractAccess(
        id,
        currentUser.userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.toContractResponse(contract);
  }

  async create(
    createContractDto: CreateContractDto,
    currentUser: AuthenticatedUser,
  ): Promise<ContractResponse> {
    // Validate student exists
    const student = await this.dataSource.manager.findOne(Student, {
      where: { id: createContractDto.student_id },
      relations: ['user'],
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Validate room exists
    const room = await this.dataSource.manager.findOne(Room, {
      where: { id: createContractDto.room_id },
      relations: ['building', 'building.manager'],
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Validate building exists (via room)
    if (!room.building) {
      throw new NotFoundException('Building not found for this room');
    }

    // Manager can only create contracts in their building
    if (currentUser.role === UserRole.MANAGER) {
      if (
        !room.building.manager ||
        room.building.manager.id !== currentUser.userId
      ) {
        throw new ForbiddenException(
          'You can only create contracts in your managed building',
        );
      }
    }

    // Validate manager exists and is a valid user
    const creator = await this.dataSource.manager.findOne(User, {
      where: { id: currentUser.userId },
    });
    if (!creator) {
      throw new NotFoundException('Creator user not found');
    }

    // Check contract_code uniqueness
    const existingCode = await this.contractsRepository.findByContractCode(
      createContractDto.contract_code,
    );
    if (existingCode) {
      throw new ConflictException('contract_code already exists');
    }

    // Check student doesn't already have an ACTIVE contract
    const hasActive =
      await this.contractsRepository.countActiveContractsByStudent(student.id);
    if (hasActive > 0) {
      throw new ConflictException('Student already has an active contract');
    }

    // Check room has available slots
    const currentOccupancy = await this.contractsRepository.getActiveOccupancy(
      room.id,
    );
    if (currentOccupancy >= room.capacity) {
      throw new BadRequestException('Room is already full');
    }

    // Check room gender matches student gender
    if (room.gender && student.gender && room.gender !== student.gender) {
      throw new BadRequestException(
        `Room gender (${room.gender}) does not match student gender (${student.gender})`,
      );
    }

    // Validate dates
    const startDate = new Date(createContractDto.start_date);
    const endDate = new Date(createContractDto.end_date);
    if (startDate > endDate) {
      throw new BadRequestException(
        'start_date must be before or equal to end_date',
      );
    }

    // Use transaction to create contract and update occupancy
    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const contractRepo = transactionalEntityManager.getRepository(Contract);

        const contract = contractRepo.create({
          contractCode: createContractDto.contract_code,
          studentId: student.id,
          roomId: room.id,
          createdBy: currentUser.userId,
          startDate,
          endDate,
          deposit: createContractDto.deposit ?? 0,
          status: createContractDto.status ?? ContractStatus.ACTIVE,
        });

        const savedContract = await contractRepo.save(contract);

        const fullContract = await contractRepo.findOne({
          where: { id: savedContract.id },
          relations: [
            'student',
            'student.user',
            'room',
            'room.building',
            'creator',
          ],
        });

        if (!fullContract) {
          throw new NotFoundException('Contract not found after creation');
        }

        return this.toContractResponse(fullContract);
      },
    );
  }

  async update(
    id: number,
    updateContractDto: UpdateContractDto,
    currentUser: AuthenticatedUser,
  ): Promise<ContractResponse> {
    const contract = await this.contractsRepository.findById(id);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Role-based access
    if (currentUser.role === UserRole.MANAGER) {
      const hasAccess = await this.contractsRepository.managerHasContractAccess(
        id,
        currentUser.userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    }

    // Track old room for occupancy recalculation
    const oldRoomId = contract.roomId;

    // Validate fields if provided
    if (updateContractDto.contract_code !== undefined) {
      const existingCode = await this.contractsRepository.findByContractCode(
        updateContractDto.contract_code,
      );
      if (existingCode && existingCode.id !== id) {
        throw new ConflictException('contract_code already exists');
      }
      contract.contractCode = updateContractDto.contract_code;
    }

    if (updateContractDto.student_id !== undefined) {
      const student = await this.dataSource.manager.findOne(Student, {
        where: { id: updateContractDto.student_id },
      });
      if (!student) {
        throw new NotFoundException('Student not found');
      }
      contract.studentId = updateContractDto.student_id;
    }

    if (updateContractDto.room_id !== undefined) {
      const room = await this.dataSource.manager.findOne(Room, {
        where: { id: updateContractDto.room_id },
        relations: ['building', 'building.manager'],
      });
      if (!room) {
        throw new NotFoundException('Room not found');
      }

      // Manager validation for new room
      if (currentUser.role === UserRole.MANAGER) {
        if (
          !room.building?.manager ||
          room.building.manager.id !== currentUser.userId
        ) {
          throw new ForbiddenException(
            'You can only update contracts within your managed building',
          );
        }
      }

      // Check new room availability
      if (contract.status === ('ACTIVE' as any)) {
        const occupancy = await this.contractsRepository.getActiveOccupancy(
          room.id,
        );
        if (occupancy >= room.capacity) {
          throw new BadRequestException('New room is already full');
        }
      }

      contract.roomId = updateContractDto.room_id;
    }

    if (updateContractDto.start_date !== undefined) {
      contract.startDate = new Date(updateContractDto.start_date);
    }

    if (updateContractDto.end_date !== undefined) {
      contract.endDate = new Date(updateContractDto.end_date);
    }

    if (updateContractDto.deposit !== undefined) {
      contract.deposit = updateContractDto.deposit;
    }

    if (updateContractDto.status !== undefined) {
      contract.status = updateContractDto.status;
    }

    // Validate dates
    if (contract.startDate > contract.endDate) {
      throw new BadRequestException(
        'start_date must be before or equal to end_date',
      );
    }

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const contractRepo = transactionalEntityManager.getRepository(Contract);
        await contractRepo.save(contract);

        const updatedContract = await contractRepo.findOne({
          where: { id },
          relations: [
            'student',
            'student.user',
            'room',
            'room.building',
            'creator',
          ],
        });

        if (!updatedContract) {
          throw new NotFoundException('Contract not found after update');
        }

        return this.toContractResponse(updatedContract);
      },
    );
  }

  async remove(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const contract = await this.contractsRepository.findById(id);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Role-based access for MANAGER
    if (currentUser.role === UserRole.MANAGER) {
      const hasAccess = await this.contractsRepository.managerHasContractAccess(
        id,
        currentUser.userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    }

    // Cannot delete ACTIVE contract if it has payments
    if (contract.status === ('ACTIVE' as any)) {
      const hasPayments =
        await this.contractsRepository.hasPaymentsForContract(id);
      if (hasPayments) {
        throw new ConflictException(
          'Cannot delete contract with associated payments',
        );
      }
    }

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const contractRepo = transactionalEntityManager.getRepository(Contract);
        await contractRepo.delete(id);

        return { message: 'Contract deleted successfully' };
      },
    );
  }
}
