import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SupportRequestsRepository } from './support-requests.repository';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { UpdateSupportRequestDto } from './dto/update-support-request.dto';
import { SupportRequest } from './support-request.entity';
import { Student } from '../students/student.entity';
import { Room } from '../rooms/room.entity';
import { Contract } from '../contracts/contract.entity';
import { User, UserRole } from '../users/user.entity';
import { SupportStatus, ContractStatus } from '../common/enums/user-role.enum';

interface AuthenticatedUser {
  userId: number;
  role: UserRole;
}

interface FindSupportRequestsQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  studentCode?: string;
  studentName?: string;
  roomNumber?: string;
  buildingName?: string;
  handledBy?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface SupportRequestResponse {
  id: number;
  studentId: number;
  roomId: number;
  category: string;
  title: string;
  description: string;
  reply: string | null;
  status: SupportStatus;
  handledBy: number | null;
  createdAt: Date;
  updatedAt: Date;
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
    building: {
      id: number;
      buildingName: string;
    } | null;
  } | null;
  handler: {
    id: number;
    fullName: string;
  } | null;
}

interface PaginatedSupportRequestsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: SupportRequestResponse[];
}

@Injectable()
export class SupportRequestsService {
  constructor(
    private readonly supportRequestsRepository: SupportRequestsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  private toSupportRequestResponse(
    request: SupportRequest,
  ): SupportRequestResponse {
    return {
      id: request.id,
      studentId: request.studentId,
      roomId: request.roomId,
      category: request.category,
      title: request.title,
      description: request.description,
      reply: request.reply,
      status: request.status,
      handledBy: request.handledBy,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      student: request.student
        ? {
            id: request.student.id,
            studentCode: request.student.studentCode,
            gender: request.student.gender ?? null,
            user: request.student.user
              ? {
                  id: request.student.user.id,
                  fullName: request.student.user.fullName,
                }
              : null,
          }
        : null,
      room: request.room
        ? {
            id: request.room.id,
            roomNumber: request.room.roomNumber,
            building: request.room.building
              ? {
                  id: request.room.building.id,
                  buildingName: request.room.building.buildingName,
                }
              : null,
          }
        : null,
      handler: request.handler
        ? {
            id: request.handler.id,
            fullName: request.handler.fullName,
          }
        : null,
    };
  }

  async findAll(
    query: FindSupportRequestsQuery,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedSupportRequestsResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const qb = this.supportRequestsRepository
      .createQueryBuilder('support_request')
      .leftJoinAndSelect('support_request.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('support_request.room', 'room')
      .leftJoinAndSelect('room.building', 'building')
      .leftJoinAndSelect('support_request.handler', 'handler');

    // Role-based scoping
    if (currentUser.role === UserRole.STUDENT) {
      // Student can only see their own requests
      const student = await this.dataSource.manager.findOne(Student, {
        where: { userId: currentUser.userId },
      });
      if (!student) {
        throw new NotFoundException('Student not found');
      }
      qb.andWhere('support_request.studentId = :studentId', {
        studentId: student.id,
      });
    } else if (currentUser.role === UserRole.MANAGER) {
      // Manager can only see requests in their building
      qb.andWhere('building.manager_id = :managerId', {
        managerId: currentUser.userId,
      });
    }
    // ADMIN sees all

    // Search
    if (query.search) {
      const search = `%${query.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(support_request.title) LIKE :search OR LOWER(support_request.description) LIKE :search OR LOWER(student.studentCode) LIKE :search OR LOWER(studentUser.fullName) LIKE :search OR LOWER(room.roomNumber) LIKE :search OR LOWER(building.buildingName) LIKE :search)',
        { search },
      );
    }

    // Filters
    if (query.category) {
      qb.andWhere('support_request.category = :category', {
        category: query.category,
      });
    }

    if (query.status) {
      qb.andWhere('support_request.status = :status', {
        status: query.status,
      });
    }

    if (query.studentCode) {
      qb.andWhere('student.studentCode = :studentCode', {
        studentCode: query.studentCode,
      });
    }

    if (query.studentName) {
      qb.andWhere('studentUser.fullName = :studentName', {
        studentName: query.studentName,
      });
    }

    if (query.roomNumber) {
      qb.andWhere('room.roomNumber = :roomNumber', {
        roomNumber: query.roomNumber,
      });
    }

    if (query.buildingName) {
      qb.andWhere('building.buildingName = :buildingName', {
        buildingName: query.buildingName,
      });
    }

    if (query.handledBy) {
      qb.andWhere('support_request.handledBy = :handledBy', {
        handledBy: query.handledBy,
      });
    }

    // Sorting
    const allowedSortBy = new Set([
      'id',
      'title',
      'category',
      'status',
      'createdAt',
      'updatedAt',
    ]);
    const sortBy = allowedSortBy.has(query.sortBy ?? '')
      ? (query.sortBy as string)
      : 'createdAt';
    const sortOrder = query.sortOrder === 'DESC' ? 'DESC' : 'ASC';
    qb.orderBy(`support_request.${sortBy}`, sortOrder);

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      data: data.map((request) => this.toSupportRequestResponse(request)),
    };
  }

  async findOne(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<SupportRequestResponse> {
    const request = await this.supportRequestsRepository.findById(id);
    if (!request) {
      throw new NotFoundException('Support request not found');
    }

    // Role-based access
    if (currentUser.role === UserRole.STUDENT) {
      const student = await this.dataSource.manager.findOne(Student, {
        where: { userId: currentUser.userId },
      });
      if (!student) {
        throw new NotFoundException('Student not found');
      }
      const hasAccess = await this.supportRequestsRepository.studentHasAccess(
        id,
        student.id,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    } else if (currentUser.role === UserRole.MANAGER) {
      const hasAccess =
        await this.supportRequestsRepository.managerHasBuildingAccess(
          id,
          currentUser.userId,
        );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    }
    // ADMIN has access

    return this.toSupportRequestResponse(request);
  }

  async create(
    createSupportRequestDto: CreateSupportRequestDto,
    currentUser: AuthenticatedUser,
  ): Promise<SupportRequestResponse> {
    // Only students can create support requests
    if (currentUser.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can create support requests');
    }

    // Validate student exists and belongs to current user
    const student = await this.dataSource.manager.findOne(Student, {
      where: { userId: currentUser.userId },
      relations: ['user'],
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Ensure the studentId in DTO matches the logged-in student
    if (createSupportRequestDto.studentId !== student.id) {
      throw new ForbiddenException('You can only create requests for yourself');
    }

    // Validate room exists
    const room = await this.dataSource.manager.findOne(Room, {
      where: { id: createSupportRequestDto.roomId },
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Validate that the student has an active contract in this room
    const contract = await this.dataSource.manager.findOne(Contract, {
      where: {
        studentId: student.id,
        roomId: room.id,
        status: ContractStatus.ACTIVE,
      },
      relations: ['room'],
    });

    if (!contract) {
      throw new NotFoundException(
        'No active contract found for this student in the specified room',
      );
    }

    // Validate category, title, and description are not empty
    if (
      !createSupportRequestDto.category ||
      !createSupportRequestDto.category.trim()
    ) {
      throw new BadRequestException('Category cannot be empty');
    }

    if (
      !createSupportRequestDto.title ||
      !createSupportRequestDto.title.trim()
    ) {
      throw new BadRequestException('Title cannot be empty');
    }

    if (
      !createSupportRequestDto.description ||
      !createSupportRequestDto.description.trim()
    ) {
      throw new BadRequestException('Description cannot be empty');
    }

    // Set status to PENDING if not provided or invalid
    const status =
      createSupportRequestDto.status &&
      Object.values(SupportStatus).includes(createSupportRequestDto.status)
        ? createSupportRequestDto.status
        : SupportStatus.PENDING;

    // Only allow PENDING status on creation
    if (status !== SupportStatus.PENDING) {
      throw new BadRequestException('Status must be PENDING for new requests');
    }

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const requestRepo =
          transactionalEntityManager.getRepository(SupportRequest);

        const request = requestRepo.create({
          studentId: student.id,
          roomId: room.id,
          category: createSupportRequestDto.category.trim(),
          title: createSupportRequestDto.title.trim(),
          description: createSupportRequestDto.description.trim(),
          reply: null,
          status,
          handledBy: null,
        });

        const savedRequest = await requestRepo.save(request);

        // Fetch with relations for response
        const fullRequest = await requestRepo.findOne({
          where: { id: savedRequest.id },
          relations: [
            'student',
            'student.user',
            'room',
            'room.building',
            'handler',
          ],
        });

        if (!fullRequest) {
          throw new NotFoundException('Request not found after creation');
        }

        return this.toSupportRequestResponse(fullRequest);
      },
    );
  }

  async update(
    id: number,
    updateSupportRequestDto: UpdateSupportRequestDto,
    currentUser: AuthenticatedUser,
  ): Promise<SupportRequestResponse> {
    const request = await this.supportRequestsRepository.findById(id);
    if (!request) {
      throw new NotFoundException('Support request not found');
    }

    // Only managers and admins can update requests (reply/change status)
    if (
      currentUser.role !== UserRole.MANAGER &&
      currentUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only managers and admins can update support requests',
      );
    }

    // Cannot update if request is already DONE
    if (request.status === SupportStatus.DONE) {
      throw new BadRequestException(
        'Cannot update a request that is already DONE',
      );
    }

    // Manager must be responsible for the building
    if (currentUser.role === UserRole.MANAGER) {
      const hasAccess =
        await this.supportRequestsRepository.managerHasBuildingAccess(
          id,
          currentUser.userId,
        );
      if (!hasAccess) {
        throw new ForbiddenException(
          'You can only update requests in your managed building',
        );
      }
    }
    // ADMIN can update any request

    // Update fields
    if (updateSupportRequestDto.reply !== undefined) {
      request.reply = updateSupportRequestDto.reply.trim() || null;
    }

    if (updateSupportRequestDto.status !== undefined) {
      if (
        !Object.values(SupportStatus).includes(updateSupportRequestDto.status)
      ) {
        throw new BadRequestException('Invalid status');
      }
      request.status = updateSupportRequestDto.status;
      // If status is set to DONE, we could set handledBy to current user if not already set
      if (request.status === SupportStatus.DONE && !request.handledBy) {
        request.handledBy = currentUser.userId;
      }
    }

    // Set handledBy to current user if not set (for tracking who processed it)
    if (!request.handledBy) {
      request.handledBy = currentUser.userId;
    }

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const requestRepo =
          transactionalEntityManager.getRepository(SupportRequest);
        await requestRepo.save(request);

        // Fetch with relations for response
        const updatedRequest = await requestRepo.findOne({
          where: { id },
          relations: [
            'student',
            'student.user',
            'room',
            'room.building',
            'handler',
          ],
        });

        if (!updatedRequest) {
          throw new NotFoundException('Request not found after update');
        }

        return this.toSupportRequestResponse(updatedRequest);
      },
    );
  }

  async remove(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const request = await this.supportRequestsRepository.findById(id);
    if (!request) {
      throw new NotFoundException('Support request not found');
    }

    // Only admins can delete requests
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete support requests');
    }

    // Cannot delete if request is DONE (or maybe PROCESSING? Let's allow deleting only PENDING and PROCESSING?)
    // Based on requirements: "Không cho Student sửa request đã được xử lý" and "Không xử lý request đã DONE"
    // For deletion, we'll allow deleting PENDING and PROCESSING, but not DONE
    if (request.status === SupportStatus.DONE) {
      throw new BadRequestException(
        'Cannot delete a request that is already DONE',
      );
    }

    await this.dataSource.transaction(async (transactionalEntityManager) => {
      const requestRepo =
        transactionalEntityManager.getRepository(SupportRequest);
      await requestRepo.delete(id);
    });

    return { message: 'Support request deleted successfully' };
  }
}
