import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { StudentsRepository } from './students.repository';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Student } from './student.entity';
import { User, UserRole, UserStatus } from '../users/user.entity';

interface AuthenticatedUser {
  userId: number;
  role: UserRole;
}

interface FindStudentsQuery {
  page?: number;
  limit?: number;
  search?: string;
  faculty?: string;
  className?: string;
  gender?: string;
  studentCode?: string;
  building?: string;
  room?: string;
  course?: string;
  status?: string;
}

interface SanitizedUser {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
}

interface StudentResponse {
  id: number;
  userId: number;
  studentCode: string;
  gender: string | null;
  birthday: Date | null;
  faculty: string | null;
  className: string | null;
  address: string | null;
  parentPhone: string | null;
  createdAt: Date;
  user: SanitizedUser | null;
}

interface PaginatedStudentsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: StudentResponse[];
}

@Injectable()
export class StudentsService {
  constructor(
    private readonly studentsRepository: StudentsRepository,
    private readonly usersService: UsersService,
  ) {}

  private sanitizeStudent(student: Student): StudentResponse {
    const user: SanitizedUser | null = student.user
      ? {
          id: student.user.id,
          username: student.user.username,
          fullName: student.user.fullName,
          email: student.user.email,
          phone: student.user.phone ?? null,
          role: student.user.role,
          status: student.user.status,
          createdAt: student.user.createdAt,
        }
      : null;

    return {
      id: student.id,
      userId: student.userId,
      studentCode: student.studentCode,
      gender: student.gender ?? null,
      birthday: student.birthday ?? null,
      faculty: student.faculty ?? null,
      className: student.className ?? null,
      address: student.address ?? null,
      parentPhone: student.parentPhone ?? null,
      createdAt: student.createdAt,
      user,
    };
  }

  private sanitizeStudents(students: Student[]): StudentResponse[] {
    return students.map((student) => this.sanitizeStudent(student));
  }

  async findAll(
    query: FindStudentsQuery,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedStudentsResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.studentsRepository.createQueryBuilder('student');
    queryBuilder.leftJoinAndSelect('student.user', 'user');

    if (currentUser.role === UserRole.STUDENT) {
      queryBuilder.where('student.userId = :userId', {
        userId: currentUser.userId,
      });
    }

    const needsContractRelations =
      currentUser.role === UserRole.MANAGER ||
      Boolean(query.building || query.room);

    if (needsContractRelations) {
      queryBuilder.leftJoin('student.contracts', 'contract');
      queryBuilder.leftJoin('contract.room', 'room');
      queryBuilder.leftJoin('room.building', 'building');
    }

    if (currentUser.role === UserRole.MANAGER) {
      queryBuilder.leftJoin('building.manager', 'buildingManager');
      queryBuilder.andWhere('buildingManager.id = :managerId', {
        managerId: currentUser.userId,
      });
    }

    queryBuilder.distinct(true);

    if (query.search) {
      const search = `%${query.search.toLowerCase()}%`;
      queryBuilder.andWhere(
        '(LOWER(student.studentCode) LIKE :search OR LOWER(student.faculty) LIKE :search OR LOWER(student.className) LIKE :search OR LOWER(user.fullName) LIKE :search OR LOWER(user.email) LIKE :search OR LOWER(user.phone) LIKE :search)',
        { search },
      );
    }

    if (query.studentCode) {
      queryBuilder.andWhere('LOWER(student.studentCode) LIKE :studentCode', {
        studentCode: `%${query.studentCode.toLowerCase()}%`,
      });
    }

    if (query.faculty) {
      queryBuilder.andWhere('LOWER(student.faculty) LIKE :faculty', {
        faculty: `%${query.faculty.toLowerCase()}%`,
      });
    }

    if (query.className) {
      queryBuilder.andWhere('LOWER(student.className) LIKE :className', {
        className: `%${query.className.toLowerCase()}%`,
      });
    }

    if (query.gender) {
      queryBuilder.andWhere('student.gender = :gender', {
        gender: query.gender,
      });
    }

    if (query.building || query.room) {
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
    }

    if (query.course) {
      queryBuilder.andWhere('LOWER(student.className) LIKE :course', {
        course: `%${query.course.toLowerCase()}%`,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('user.status = :status', { status: query.status });
    }

    queryBuilder.orderBy('student.id', 'ASC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      data: this.sanitizeStudents(data),
    };
  }

  async findOne(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<StudentResponse> {
    const student = await this.studentsRepository.findById(id);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (
      currentUser.role === UserRole.STUDENT &&
      student.userId !== currentUser.userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    if (currentUser.role === UserRole.MANAGER) {
      const hasAccess =
        await this.studentsRepository.managerQueryHasAccessToStudent(
          id,
          currentUser.userId,
        );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.sanitizeStudent(student);
  }

  async create(
    createStudentDto: CreateStudentDto,
    currentUser?: AuthenticatedUser,
  ): Promise<StudentResponse> {
    const user = await this.usersService.findOne(createStudentDto.user_id);
    if (user.role !== UserRole.STUDENT) {
      throw new BadRequestException('user_id must reference a STUDENT user');
    }

    const existingStudentCode = await this.studentsRepository.findByStudentCode(
      createStudentDto.student_code,
    );
    if (existingStudentCode) {
      throw new ConflictException('student_code already exists');
    }

    const existingStudentForUser = await this.studentsRepository.findByUserId(
      createStudentDto.user_id,
    );
    if (existingStudentForUser) {
      throw new ConflictException(
        'user_id already linked to another student profile',
      );
    }

    const student = this.studentsRepository.create({
      userId: createStudentDto.user_id,
      studentCode: createStudentDto.student_code,
      gender: createStudentDto.gender ?? null,
      birthday: createStudentDto.birthday ?? null,
      faculty: createStudentDto.faculty ?? null,
      className: createStudentDto.class_name ?? null,
      address: createStudentDto.address ?? null,
      parentPhone: createStudentDto.parent_phone ?? null,
    });

    let createdStudent: Student | null = null;

    await this.studentsRepository.manager.transaction(async (manager) => {
      const studentRepository = manager.getRepository(Student);
      const userRepository = manager.getRepository(User);

      const savedStudent = await studentRepository.save(student);

      if (
        createStudentDto.email !== undefined ||
        createStudentDto.phone !== undefined
      ) {
        const userToUpdate = await userRepository.findOne({
          where: { id: user.id },
        });
        if (!userToUpdate) {
          throw new NotFoundException('User not found');
        }

        if (createStudentDto.email !== undefined) {
          userToUpdate.email = createStudentDto.email;
        }

        if (createStudentDto.phone !== undefined) {
          userToUpdate.phone = createStudentDto.phone;
        }

        await userRepository.save(userToUpdate);
      }

      createdStudent = await studentRepository.findOne({
        where: { id: savedStudent.id },
        relations: ['user'],
      });
    });
    if (!createdStudent) {
      throw new NotFoundException('Student not found');
    }

    return this.sanitizeStudent(createdStudent);
  }

  async update(
    id: number,
    updateStudentDto: UpdateStudentDto,
    currentUser?: AuthenticatedUser,
  ): Promise<StudentResponse> {
    const student = await this.studentsRepository.findOne({ where: { id } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (currentUser?.role === UserRole.STUDENT) {
      if (student.userId !== currentUser.userId) {
        throw new ForbiddenException('Access denied');
      }

      const allowedFields = new Set(['email', 'phone']);
      const providedFields = Object.entries(updateStudentDto)
        .filter(([, value]) => value !== undefined)
        .map(([field]) => field);

      if (providedFields.some((field) => !allowedFields.has(field))) {
        throw new ForbiddenException(
          'You can only update your email and phone',
        );
      }
    }

    if (updateStudentDto.user_id !== undefined) {
      const user = await this.usersService.findOne(updateStudentDto.user_id);
      if (user.role !== UserRole.STUDENT) {
        throw new BadRequestException('user_id must reference a STUDENT user');
      }
      const existingStudentForUser = await this.studentsRepository.findByUserId(
        updateStudentDto.user_id,
      );
      if (existingStudentForUser && existingStudentForUser.id !== id) {
        throw new ConflictException(
          'user_id already linked to another student profile',
        );
      }
      student.userId = updateStudentDto.user_id;
    }

    if (updateStudentDto.student_code !== undefined) {
      const duplicate = await this.studentsRepository.findByStudentCode(
        updateStudentDto.student_code,
      );
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('student_code already exists');
      }
      student.studentCode = updateStudentDto.student_code;
    }

    if (updateStudentDto.gender !== undefined) {
      student.gender = updateStudentDto.gender;
    }

    if (updateStudentDto.birthday !== undefined) {
      student.birthday = updateStudentDto.birthday;
    }

    if (updateStudentDto.faculty !== undefined) {
      student.faculty = updateStudentDto.faculty;
    }

    if (updateStudentDto.class_name !== undefined) {
      student.className = updateStudentDto.class_name;
    }

    if (updateStudentDto.address !== undefined) {
      student.address = updateStudentDto.address;
    }

    if (updateStudentDto.parent_phone !== undefined) {
      student.parentPhone = updateStudentDto.parent_phone;
    }

    let updatedStudent: Student | null = null;

    await this.studentsRepository.manager.transaction(async (manager) => {
      const studentRepository = manager.getRepository(Student);
      const userRepository = manager.getRepository(User);

      const studentToUpdate = await studentRepository.findOne({
        where: { id },
      });
      if (!studentToUpdate) {
        throw new NotFoundException('Student not found');
      }

      Object.assign(studentToUpdate, student);
      await studentRepository.save(studentToUpdate);

      if (
        updateStudentDto.email !== undefined ||
        updateStudentDto.phone !== undefined
      ) {
        const userToUpdate = await userRepository.findOne({
          where: { id: studentToUpdate.userId },
        });
        if (!userToUpdate) {
          throw new NotFoundException('User not found');
        }

        if (updateStudentDto.email !== undefined) {
          userToUpdate.email = updateStudentDto.email;
        }

        if (updateStudentDto.phone !== undefined) {
          userToUpdate.phone = updateStudentDto.phone;
        }

        await userRepository.save(userToUpdate);
      }

      updatedStudent = await studentRepository.findOne({
        where: { id: studentToUpdate.id },
        relations: ['user'],
      });
    });

    if (!updatedStudent) {
      throw new NotFoundException('Student not found');
    }
    return this.sanitizeStudent(updatedStudent);
  }

  async deactivate(
    id: number,
    currentUser?: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const student = await this.studentsRepository.findOne({ where: { id } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (currentUser?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    const hasActiveContract =
      await this.studentsRepository.hasActiveContractForStudent(id);
    if (hasActiveContract) {
      throw new ConflictException(
        'Cannot delete student with an active contract',
      );
    }

    const hasPayment = await this.studentsRepository.hasPaymentForStudent(id);
    if (hasPayment) {
      throw new ConflictException('Cannot delete student with payments');
    }

    const hasRoomChangeRequest =
      await this.studentsRepository.hasRoomChangeRequestForStudent(id);
    if (hasRoomChangeRequest) {
      throw new ConflictException(
        'Cannot delete student with room change requests',
      );
    }

    const hasSupportRequest =
      await this.studentsRepository.hasSupportRequestForStudent(id);
    if (hasSupportRequest) {
      throw new ConflictException(
        'Cannot delete student with support requests',
      );
    }

    await this.studentsRepository.manager.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const userToDeactivate = await userRepository.findOne({
        where: { id: student.userId },
      });

      if (!userToDeactivate) {
        throw new NotFoundException('User not found');
      }

      userToDeactivate.status = UserStatus.INACTIVE;
      await userRepository.save(userToDeactivate);
    });

    return { message: 'Student account disabled successfully' };
  }

  async remove(
    id: number,
    currentUser?: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.deactivate(id, currentUser);
  }
}
