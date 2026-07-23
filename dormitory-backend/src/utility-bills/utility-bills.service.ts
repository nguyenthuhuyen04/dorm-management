import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UtilityBillsRepository } from './utility-bills.repository';
import { CreateUtilityBillDto } from './dto/create-utility-bill.dto';
import { UpdateUtilityBillDto } from './dto/update-utility-bill.dto';
import { UtilityBill } from './utility-bill.entity';
import { Room } from '../rooms/room.entity';
import { Contract } from '../contracts/contract.entity';
import { User, UserRole } from '../users/user.entity';
import { UtilityBillStatus } from '../common/enums/user-role.enum';
import { ContractStatus } from '../common/enums/user-role.enum';

interface AuthenticatedUser {
  userId: number;
  role: UserRole;
}

interface FindUtilityBillsQuery {
  page?: number;
  limit?: number;
  search?: string;
  building?: string;
  room?: string;
  contract?: string;
  student?: string;
  month?: number;
  year?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface UtilityBillResponse {
  id: number;
  roomId: number;
  month: number;
  year: number;
  electricOld: number;
  electricNew: number;
  waterOld: number;
  waterNew: number;
  electricFee: number;
  waterFee: number;
  total: number;
  status: UtilityBillStatus;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  room: {
    id: number;
    roomNumber: string;
    building: {
      id: number;
      buildingName: string;
    } | null;
  } | null;
  creator: {
    id: number;
    fullName: string;
  } | null;
  payments: Array<{
    id: number;
    invoiceCode: string;
    status: string;
  }> | null;
}

interface PaginatedUtilityBillsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: UtilityBillResponse[];
}

@Injectable()
export class UtilityBillsService {
  constructor(
    private readonly utilityBillsRepository: UtilityBillsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  private toUtilityBillResponse(bill: UtilityBill): UtilityBillResponse {
    const electricFee = Number(bill.electricFee);
    const waterFee = Number(bill.waterFee);
    return {
      id: bill.id,
      roomId: bill.roomId,
      month: bill.month,
      year: bill.year,
      electricOld: bill.electricOld,
      electricNew: bill.electricNew,
      waterOld: bill.waterOld,
      waterNew: bill.waterNew,
      electricFee,
      waterFee,
      total: electricFee + waterFee,
      status: bill.status,
      createdBy: bill.createdBy,
      createdAt: bill.createdAt,
      updatedAt: bill.updatedAt,
      room: bill.room
        ? {
            id: bill.room.id,
            roomNumber: bill.room.roomNumber,
            building: bill.room.building
              ? {
                  id: bill.room.building.id,
                  buildingName: bill.room.building.buildingName,
                }
              : null,
          }
        : null,
      creator: bill.creator
        ? {
            id: bill.creator.id,
            fullName: bill.creator.fullName,
          }
        : null,
      payments: bill.payments?.length
        ? bill.payments.map((p) => ({
            id: p.id,
            invoiceCode: p.invoiceCode,
            status: p.status,
          }))
        : null,
    };
  }

  async findAll(
    query: FindUtilityBillsQuery,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedUtilityBillsResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.utilityBillsRepository
      .createQueryBuilder('bill')
      .leftJoinAndSelect('bill.room', 'room')
      .leftJoinAndSelect('room.building', 'building')
      .leftJoinAndSelect('bill.creator', 'creator')
      .leftJoinAndSelect('bill.payments', 'payments');

    // Role-based scoping
    if (currentUser.role === UserRole.STUDENT) {
      queryBuilder.innerJoin(
        'room.contracts',
        'contract',
        'contract.status = :contractStatus',
        { contractStatus: ContractStatus.ACTIVE },
      );
      queryBuilder.innerJoin('contract.student', 'student');
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
        '(LOWER(room.roomNumber) LIKE :search OR LOWER(building.buildingName) LIKE :search)',
        { search },
      );
    }

    // Filters
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

    if (query.month) {
      queryBuilder.andWhere('bill.month = :month', {
        month: query.month,
      });
    }

    if (query.year) {
      queryBuilder.andWhere('bill.year = :year', {
        year: query.year,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('bill.status = :status', {
        status: query.status,
      });
    }

    // Sorting
    const allowedSortBy = new Set([
      'id',
      'month',
      'year',
      'electricFee',
      'waterFee',
      'status',
      'createdAt',
    ]);
    const sortBy = allowedSortBy.has(query.sortBy ?? '')
      ? (query.sortBy as string)
      : 'id';
    const sortOrder = query.sortOrder === 'DESC' ? 'DESC' : 'ASC';
    queryBuilder.orderBy(`bill.${sortBy}`, sortOrder);

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      data: data.map((bill) => this.toUtilityBillResponse(bill)),
    };
  }

  async findOne(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<UtilityBillResponse> {
    const bill = await this.utilityBillsRepository.findById(id);
    if (!bill) {
      throw new NotFoundException('Utility bill not found');
    }

    // Role-based access
    if (currentUser.role === UserRole.STUDENT) {
      const hasAccess = await this.utilityBillsRepository.studentHasBillAccess(
        id,
        currentUser.userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    } else if (currentUser.role === UserRole.MANAGER) {
      const hasAccess =
        await this.utilityBillsRepository.managerHasBuildingAccess(
          id,
          currentUser.userId,
        );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.toUtilityBillResponse(bill);
  }

  async create(
    createUtilityBillDto: CreateUtilityBillDto,
    currentUser: AuthenticatedUser,
  ): Promise<UtilityBillResponse> {
    // Validate room exists
    const room = await this.dataSource.manager.findOne(Room, {
      where: { id: createUtilityBillDto.room_id },
      relations: ['building', 'building.manager'],
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Manager can only create bills in their managed building
    if (currentUser.role === UserRole.MANAGER) {
      if (
        !room.building?.manager ||
        room.building.manager.id !== currentUser.userId
      ) {
        throw new ForbiddenException(
          'You can only create utility bills in your managed building',
        );
      }
    }

    // Validate electric_new >= electric_old
    if (createUtilityBillDto.electric_new < createUtilityBillDto.electric_old) {
      throw new BadRequestException(
        'electric_new must be greater than or equal to electric_old',
      );
    }

    // Validate water_new >= water_old
    if (createUtilityBillDto.water_new < createUtilityBillDto.water_old) {
      throw new BadRequestException(
        'water_new must be greater than or equal to water_old',
      );
    }

    // Check unique room/month/year
    const existing = await this.utilityBillsRepository.findByRoomAndMonth(
      createUtilityBillDto.room_id,
      createUtilityBillDto.month,
      createUtilityBillDto.year,
    );
    if (existing) {
      throw new ConflictException(
        'A utility bill already exists for this room in the given month/year',
      );
    }

    // Calculate fees if not provided
    const electricConsumption =
      createUtilityBillDto.electric_new - createUtilityBillDto.electric_old;
    const waterConsumption =
      createUtilityBillDto.water_new - createUtilityBillDto.water_old;

    // Default electric rate (can be configured via regulations)
    const ELECTRIC_RATE = 3500; // 3500 VND/kWh
    const WATER_RATE = 10000; // 10000 VND/m³

    const electricFee =
      createUtilityBillDto.electric_fee ??
      Math.round(electricConsumption * ELECTRIC_RATE);
    const waterFee =
      createUtilityBillDto.water_fee ??
      Math.round(waterConsumption * WATER_RATE);

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const billRepo = transactionalEntityManager.getRepository(UtilityBill);

        const bill = billRepo.create({
          roomId: createUtilityBillDto.room_id,
          month: createUtilityBillDto.month,
          year: createUtilityBillDto.year,
          electricOld: createUtilityBillDto.electric_old,
          electricNew: createUtilityBillDto.electric_new,
          waterOld: createUtilityBillDto.water_old,
          waterNew: createUtilityBillDto.water_new,
          electricFee,
          waterFee,
          status: createUtilityBillDto.status ?? UtilityBillStatus.DRAFT,
          createdBy: currentUser.userId,
        });

        const savedBill = await billRepo.save(bill);

        const fullBill = await billRepo.findOne({
          where: { id: savedBill.id },
          relations: ['room', 'room.building', 'creator', 'payments'],
        });

        if (!fullBill) {
          throw new NotFoundException('Bill not found after creation');
        }

        return this.toUtilityBillResponse(fullBill);
      },
    );
  }

  async update(
    id: number,
    updateUtilityBillDto: UpdateUtilityBillDto,
    currentUser: AuthenticatedUser,
  ): Promise<UtilityBillResponse> {
    const bill = await this.utilityBillsRepository.findById(id);
    if (!bill) {
      throw new NotFoundException('Utility bill not found');
    }

    // Cannot update bill that is PUBLISHED
    if (bill.status === UtilityBillStatus.PUBLISHED) {
      throw new BadRequestException(
        'Cannot update a PUBLISHED utility bill. Unpublish it first.',
      );
    }

    // Role-based access
    if (currentUser.role === UserRole.MANAGER) {
      const hasAccess =
        await this.utilityBillsRepository.managerHasBuildingAccess(
          id,
          currentUser.userId,
        );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    }

    // Validate room if changing
    if (updateUtilityBillDto.room_id !== undefined) {
      const room = await this.dataSource.manager.findOne(Room, {
        where: { id: updateUtilityBillDto.room_id },
        relations: ['building', 'building.manager'],
      });
      if (!room) {
        throw new NotFoundException('Room not found');
      }

      if (currentUser.role === UserRole.MANAGER) {
        if (
          !room.building?.manager ||
          room.building.manager.id !== currentUser.userId
        ) {
          throw new ForbiddenException(
            'You can only update bills in your managed building',
          );
        }
      }

      bill.roomId = updateUtilityBillDto.room_id;
    }

    // Validate electric_new >= electric_old
    const electricOld = updateUtilityBillDto.electric_old ?? bill.electricOld;
    const electricNew = updateUtilityBillDto.electric_new ?? bill.electricNew;
    if (electricNew < electricOld) {
      throw new BadRequestException(
        'electric_new must be greater than or equal to electric_old',
      );
    }

    // Validate water_new >= water_old
    const waterOld = updateUtilityBillDto.water_old ?? bill.waterOld;
    const waterNew = updateUtilityBillDto.water_new ?? bill.waterNew;
    if (waterNew < waterOld) {
      throw new BadRequestException(
        'water_new must be greater than or equal to water_old',
      );
    }

    // Check unique room/month/year if changing room or month/year
    const targetRoomId = updateUtilityBillDto.room_id ?? bill.roomId;
    const targetMonth = updateUtilityBillDto.month ?? bill.month;
    const targetYear = updateUtilityBillDto.year ?? bill.year;
    if (
      targetRoomId !== bill.roomId ||
      targetMonth !== bill.month ||
      targetYear !== bill.year
    ) {
      const existing = await this.utilityBillsRepository.findByRoomAndMonth(
        targetRoomId,
        targetMonth,
        targetYear,
      );
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'A utility bill already exists for this room in the given month/year',
        );
      }
    }

    // Apply updates
    if (updateUtilityBillDto.month !== undefined) {
      bill.month = updateUtilityBillDto.month;
    }
    if (updateUtilityBillDto.year !== undefined) {
      bill.year = updateUtilityBillDto.year;
    }
    if (updateUtilityBillDto.electric_old !== undefined) {
      bill.electricOld = updateUtilityBillDto.electric_old;
    }
    if (updateUtilityBillDto.electric_new !== undefined) {
      bill.electricNew = updateUtilityBillDto.electric_new;
    }
    if (updateUtilityBillDto.water_old !== undefined) {
      bill.waterOld = updateUtilityBillDto.water_old;
    }
    if (updateUtilityBillDto.water_new !== undefined) {
      bill.waterNew = updateUtilityBillDto.water_new;
    }
    if (updateUtilityBillDto.electric_fee !== undefined) {
      bill.electricFee = updateUtilityBillDto.electric_fee;
    }
    if (updateUtilityBillDto.water_fee !== undefined) {
      bill.waterFee = updateUtilityBillDto.water_fee;
    }
    if (updateUtilityBillDto.status !== undefined) {
      bill.status = updateUtilityBillDto.status;
    }

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const billRepo = transactionalEntityManager.getRepository(UtilityBill);
        await billRepo.save(bill);

        const updatedBill = await billRepo.findOne({
          where: { id },
          relations: ['room', 'room.building', 'creator', 'payments'],
        });

        if (!updatedBill) {
          throw new NotFoundException('Bill not found after update');
        }

        return this.toUtilityBillResponse(updatedBill);
      },
    );
  }

  async remove(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const bill = await this.utilityBillsRepository.findById(id);
    if (!bill) {
      throw new NotFoundException('Utility bill not found');
    }

    // Role-based access for MANAGER
    if (currentUser.role === UserRole.MANAGER) {
      const hasAccess =
        await this.utilityBillsRepository.managerHasBuildingAccess(
          id,
          currentUser.userId,
        );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    }

    // Cannot delete PUBLISHED bill if it has payments
    if (bill.status === UtilityBillStatus.PUBLISHED && bill.payments?.length) {
      throw new ConflictException(
        'Cannot delete PUBLISHED utility bill with associated payments',
      );
    }

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const billRepo = transactionalEntityManager.getRepository(UtilityBill);
        await billRepo.delete(id);

        return { message: 'Utility bill deleted successfully' };
      },
    );
  }
}
