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
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STUDENT)
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('building_id') buildingId?: string,
    @Query('status') status?: string,
    @Query('gender') gender?: string,
    @Query('floor') floor?: string,
    @Query('room_type') roomType?: string,
  ): Promise<Awaited<ReturnType<RoomsService['findAll']>>> {
    return this.roomsService.findAll(
      {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        search: search?.trim() || undefined,
        buildingId: buildingId ? Number(buildingId) : undefined,
        status: status?.trim() || undefined,
        gender: gender?.trim() || undefined,
        floor: floor ? Number(floor) : undefined,
        roomType: roomType?.trim() || undefined,
      },
      req.user,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STUDENT)
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<RoomsService['findOne']>>> {
    const roomId = Number(id);
    if (Number.isNaN(roomId)) {
      throw new BadRequestException('Invalid room id.');
    }
    return this.roomsService.findOne(roomId, req.user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async create(
    @Body() createRoomDto: CreateRoomDto,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<RoomsService['create']>>> {
    return this.roomsService.create(createRoomDto, req.user);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<RoomsService['update']>>> {
    const roomId = Number(id);
    if (Number.isNaN(roomId)) {
      throw new BadRequestException('Invalid room id.');
    }
    return this.roomsService.update(roomId, updateRoomDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<RoomsService['remove']>>> {
    const roomId = Number(id);
    if (Number.isNaN(roomId)) {
      throw new BadRequestException('Invalid room id.');
    }
    return this.roomsService.remove(roomId, req.user);
  }
}
