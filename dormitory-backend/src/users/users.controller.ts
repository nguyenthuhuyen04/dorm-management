import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseInterceptors,
  Req,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { Roles } from '../auth/roles.decorator';
import { User, UserRole, UserStatus } from './user.entity';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private validateUserId(id: string): number {
    const requestedId = Number(id);
    if (Number.isNaN(requestedId)) {
      throw new BadRequestException('Invalid user id.');
    }
    return requestedId;
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('username') username?: string,
    @Query('email') email?: string,
    @Query('full_name') fullNameQuery?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<User[] | Awaited<ReturnType<UsersService['findAllWithFilters']>>> {
    const hasQueryParams = Boolean(
      page ||
      limit ||
      username ||
      email ||
      fullNameQuery ||
      role ||
      status ||
      sortBy ||
      sortOrder,
    );

    const currentUser = req.user as any;

    if (!hasQueryParams) {
      return this.usersService.findAll(currentUser);
    }

    return this.usersService.findAllWithFilters(
      {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        username: username?.trim() || undefined,
        email: email?.trim() || undefined,
        full_name: fullNameQuery?.trim() || undefined,
        role,
        status,
        sortBy,
        sortOrder,
      },
      currentUser,
    );
  }

  @Get('me')
  async getMe(@Req() req: Request): Promise<User> {
    const currentUser = req.user as { userId?: number } | undefined;
    if (!currentUser?.userId) {
      throw new BadRequestException('Invalid user id.');
    }

    return this.usersService.findOne(currentUser.userId, currentUser);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STUDENT)
  async findOne(@Param('id') id: string, @Req() req: Request): Promise<User> {
    const requestedId = this.validateUserId(id);
    const currentUser = req.user as any;

    return this.usersService.findOne(requestedId, currentUser);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(201)
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request,
  ): Promise<User> {
    const requestedId = this.validateUserId(id);
    return this.usersService.update(
      requestedId,
      updateUserDto,
      req.user as any,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    const requestedId = this.validateUserId(id);
    return this.usersService.remove(requestedId);
  }
}
