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
import { SupportRequestsService } from './support-requests.service';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { UpdateSupportRequestDto } from './dto/update-support-request.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('support-requests')
export class SupportRequestsController {
  constructor(private readonly supportRequestsService: SupportRequestsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STUDENT)
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('studentCode') studentCode?: string,
    @Query('studentName') studentName?: string,
    @Query('roomNumber') roomNumber?: string,
    @Query('buildingName') buildingName?: string,
    @Query('handledBy') handledBy?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<Awaited<ReturnType<SupportRequestsService['findAll']>>> {
    return this.supportRequestsService.findAll(
      {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        search: search?.trim() || undefined,
        category: category?.trim() || undefined,
        status: status?.trim() || undefined,
        studentCode: studentCode?.trim() || undefined,
        studentName: studentName?.trim() || undefined,
        roomNumber: roomNumber?.trim() || undefined,
        buildingName: buildingName?.trim() || undefined,
        handledBy: handledBy ? Number(handledBy) : undefined,
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
  ): Promise<Awaited<ReturnType<SupportRequestsService['findOne']>>> {
    const requestId = Number(id);
    if (Number.isNaN(requestId)) {
      throw new BadRequestException('Invalid request id.');
    }
    return this.supportRequestsService.findOne(requestId, req.user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STUDENT)
  async create(
    @Body() createSupportRequestDto: CreateSupportRequestDto,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<SupportRequestsService['create']>>> {
    return this.supportRequestsService.create(createSupportRequestDto, req.user);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() updateSupportRequestDto: UpdateSupportRequestDto,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<SupportRequestsService['update']>>> {
    const requestId = Number(id);
    if (Number.isNaN(requestId)) {
      throw new BadRequestException('Invalid request id.');
    }
    return this.supportRequestsService.update(requestId, updateSupportRequestDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<SupportRequestsService['remove']>>> {
    const requestId = Number(id);
    if (Number.isNaN(requestId)) {
      throw new BadRequestException('Invalid request id.');
    }
    return this.supportRequestsService.remove(requestId, req.user);
  }
}