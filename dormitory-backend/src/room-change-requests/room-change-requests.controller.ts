import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { RoomChangeRequestsService } from './room-change-requests.service';
import { CreateRoomChangeRequestDto } from './dto/create-room-change-request.dto';
import { UpdateRoomChangeRequestDto } from './dto/update-room-change-request.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import {
  PaginatedRoomChangeRequestsResponse,
  RoomChangeRequestResponse,
} from './room-change-requests.service';

@Controller('room-change-requests')
export class RoomChangeRequestsController {
  constructor(
    private readonly roomChangeRequestsService: RoomChangeRequestsService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STUDENT)
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('buildingId') buildingId?: string,
    @Query('currentRoomId') currentRoomId?: string,
    @Query('requestedRoomId') requestedRoomId?: string,
    @Query('studentId') studentId?: string,
    @Query('approvedBy') approvedBy?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<PaginatedRoomChangeRequestsResponse> {
    return this.roomChangeRequestsService.findAll(
      {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        search: search?.trim() || undefined,
        status: status?.trim() as any,
        buildingId: buildingId ? Number(buildingId) : undefined,
        currentRoomId: currentRoomId ? Number(currentRoomId) : undefined,
        requestedRoomId: requestedRoomId ? Number(requestedRoomId) : undefined,
        studentId: studentId ? Number(studentId) : undefined,
        approvedBy: approvedBy ? Number(approvedBy) : undefined,
        sortBy: sortBy?.trim() || undefined,
        sortOrder,
      },
      req.user,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STUDENT)
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<RoomChangeRequestResponse> {
    const requestId = Number(id);
    if (Number.isNaN(requestId)) {
      throw new BadRequestException('Invalid request id.');
    }
    return this.roomChangeRequestsService.findOne(requestId, req.user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STUDENT)
  async create(
    @Body() createRoomChangeRequestDto: CreateRoomChangeRequestDto,
    @Req() req: any,
  ): Promise<RoomChangeRequestResponse> {
    return this.roomChangeRequestsService.create(
      createRoomChangeRequestDto,
      req.user,
    );
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() updateRoomChangeRequestDto: UpdateRoomChangeRequestDto,
    @Req() req: any,
  ): Promise<RoomChangeRequestResponse> {
    const requestId = Number(id);
    if (Number.isNaN(requestId)) {
      throw new BadRequestException('Invalid request id.');
    }
    return this.roomChangeRequestsService.update(
      requestId,
      updateRoomChangeRequestDto,
      req.user,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string, @Req() req: any) {
    const requestId = Number(id);
    if (Number.isNaN(requestId)) {
      throw new BadRequestException('Invalid request id.');
    }
    return this.roomChangeRequestsService.remove(requestId, req.user);
  }
}
