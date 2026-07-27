import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole, UserStatus } from './user.entity';

interface CurrentUserContext {
  userId?: number;
  role?: UserRole;
}

interface UsersQueryParams {
  page?: number;
  limit?: number;
  username?: string;
  email?: string;
  full_name?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface PaginatedUsersResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: User[];
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  private mapFullNameValue(fullName?: string): string {
    return fullName ?? '';
  }

  private getUserVisibilityScope(
    currentUser?: CurrentUserContext,
  ): UserRole | 'SELF' | null {
    if (!currentUser?.role || currentUser.role === UserRole.ADMIN) {
      return null;
    }

    if (currentUser.role === UserRole.MANAGER) {
      return UserRole.MANAGER;
    }

    if (currentUser.role === UserRole.STUDENT) {
      return 'SELF';
    }

    return null;
  }

  private applyVisibilityScope(
    queryBuilder: any,
    currentUser?: CurrentUserContext,
  ): void {
    const scope = this.getUserVisibilityScope(currentUser);

    if (scope === UserRole.MANAGER) {
      queryBuilder.andWhere('user.role = :studentRole', {
        studentRole: UserRole.STUDENT,
      });
      return;
    }

    if (scope === 'SELF') {
      queryBuilder.andWhere('user.id = :currentUserId', {
        currentUserId: currentUser?.userId,
      });
    }
  }

  private validateUserAccess(
    targetUser: User,
    currentUser?: CurrentUserContext,
  ): void {
    if (!currentUser?.role || currentUser.role === UserRole.ADMIN) {
      return;
    }

    if (currentUser.role === UserRole.STUDENT) {
      if (targetUser.id !== currentUser.userId) {
        throw new ForbiddenException(
          'Bạn chỉ có thể truy cập hồ sơ của chính mình.',
        );
      }
      return;
    }

    if (currentUser.role === UserRole.MANAGER) {
      if (targetUser.role === UserRole.ADMIN) {
        throw new ForbiddenException(
          'Bạn không có quyền thực hiện chức năng này.',
        );
      }

      if (
        targetUser.role === UserRole.MANAGER &&
        targetUser.id !== currentUser.userId
      ) {
        throw new ForbiddenException(
          'Bạn không có quyền thực hiện chức năng này.',
        );
      }
    }
  }

  async create(
    createUserDto: CreateUserDto,
    currentUser?: CurrentUserContext,
  ): Promise<User> {
    const requestedRole = createUserDto.role ?? UserRole.STUDENT;
    if (
      (requestedRole === UserRole.MANAGER ||
        requestedRole === UserRole.ADMIN) &&
      currentUser?.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only administrators can create manager or admin accounts.',
      );
    }

    const existingEmail = await this.usersRepository.findByEmail(
      createUserDto.email,
    );
    if (existingEmail) {
      throw new ConflictException('Email đã được sử dụng.');
    }

    const existingUsername = await this.usersRepository.findByUsername(
      createUserDto.username,
    );
    if (existingUsername) {
      throw new ConflictException('Tên đăng nhập đã được sử dụng.');
    }

    const passwordHash = await hash(createUserDto.password, 10);
    const fullNameValue = this.mapFullNameValue(createUserDto.full_name);
    const user = this.usersRepository.create({
      username: createUserDto.username,
      fullName: fullNameValue,
      email: createUserDto.email,
      phone: createUserDto.phone ?? null,
      password: passwordHash,
      role: requestedRole,
      status: createUserDto.status ?? UserStatus.ACTIVE,
    });

    return await this.usersRepository.save(user);
  }

  async findAll(currentUser?: CurrentUserContext): Promise<User[]> {
    const where: any = { status: UserStatus.ACTIVE };
    const scope = this.getUserVisibilityScope(currentUser);

    if (scope === UserRole.MANAGER) {
      where.role = UserRole.STUDENT;
    } else if (scope === 'SELF') {
      where.id = currentUser?.userId;
    }

    return this.usersRepository.find({
      where,
      order: { id: 'ASC' },
    });
  }

  async findAllWithFilters(
    query: UsersQueryParams,
    currentUser?: CurrentUserContext,
  ): Promise<PaginatedUsersResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    queryBuilder.where('user.status = :status', {
      status: query.status ?? UserStatus.ACTIVE,
    });

    this.applyVisibilityScope(queryBuilder, currentUser);

    if (query.role) {
      queryBuilder.andWhere('user.role = :role', { role: query.role });
    }

    if (query.username) {
      queryBuilder.andWhere('LOWER(user.username) LIKE :username', {
        username: `%${query.username.toLowerCase()}%`,
      });
    }

    if (query.email) {
      queryBuilder.andWhere('LOWER(user.email) LIKE :email', {
        email: `%${query.email.toLowerCase()}%`,
      });
    }

    if (query.full_name) {
      queryBuilder.andWhere('LOWER(user.fullName) LIKE :fullName', {
        fullName: `%${query.full_name.toLowerCase()}%`,
      });
    }

    const allowedSortBy = new Set(['id', 'username', 'email', 'createdAt']);
    const sortBy = allowedSortBy.has(query.sortBy ?? '')
      ? (query.sortBy as string)
      : 'id';
    const sortOrder = query.sortOrder === 'DESC' ? 'DESC' : 'ASC';

    queryBuilder.orderBy(`user.${sortBy}`, sortOrder).skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async findOne(id: number, currentUser?: CurrentUserContext): Promise<User> {
    const user = await this.usersRepository.findActiveUserById(id);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    this.validateUserAccess(user, currentUser);
    return user;
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    currentUser?: CurrentUserContext,
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmailUser = await this.usersRepository.findByEmail(
        updateUserDto.email,
      );
      if (existingEmailUser && existingEmailUser.id !== id) {
        throw new ConflictException('Email đã được sử dụng.');
      }
    }

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUsernameUser = await this.usersRepository.findByUsername(
        updateUserDto.username,
      );
      if (existingUsernameUser && existingUsernameUser.id !== id) {
        throw new ConflictException('Tên đăng nhập đã được sử dụng.');
      }
    }

    if (updateUserDto.password !== undefined) {
      const normalizedPassword = updateUserDto.password.trim();
      const passwordRegex =
        /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

      if (!passwordRegex.test(normalizedPassword)) {
        throw new BadRequestException(
          'Password must be at least 8 characters, include an uppercase letter, a number, and a special character',
        );
      }

      user.password = await hash(normalizedPassword, 10);
    }

    if (updateUserDto.username !== undefined) {
      user.username = updateUserDto.username;
    }

    if (updateUserDto.full_name !== undefined) {
      // DTO uses snake_case full_name, while the entity stores fullName.
      user.fullName = updateUserDto.full_name;
    }

    if (updateUserDto.email !== undefined) {
      user.email = updateUserDto.email;
    }

    if (updateUserDto.phone !== undefined) {
      user.phone = updateUserDto.phone;
    }

    if (updateUserDto.role !== undefined) {
      if (currentUser?.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          'Bạn không có quyền thực hiện chức năng này.',
        );
      }
      user.role = updateUserDto.role;
    }

    if (updateUserDto.status !== undefined) {
      user.status = updateUserDto.status;
    }

    await this.usersRepository.save(user);
    return this.findOne(id, currentUser);
  }

  async remove(id: number): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['student', 'managedBuildings'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === UserStatus.INACTIVE) {
      return { message: 'User already deleted' };
    }

    if (user.role === UserRole.MANAGER && user.managedBuildings?.length) {
      throw new ConflictException(
        `Không thể xóa quản lý "${user.fullName || user.username}" vì người này đang quản lý ${user.managedBuildings.length} tòa nhà. Vui lòng chuyển quyền quản lý sang người khác trước khi xóa.`,
      );
    }

    user.status = UserStatus.INACTIVE;
    await this.usersRepository.save(user);
    return { message: 'User deleted successfully' };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findByUsernameOrEmail(identifier: string): Promise<User | null> {
    return this.usersRepository.findByUsernameOrEmail(identifier);
  }
}
