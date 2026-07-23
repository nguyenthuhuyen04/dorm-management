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
import { UtilityBillsService } from './utility-bills.service';
import { CreateUtilityBillDto } from './dto/create-utility-bill.dto';
import { UpdateUtilityBillDto } from './dto/update-utility-bill.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('utility-bills')
export class UtilityBillsController {
  constructor(private readonly utilityBillsService: UtilityBillsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STUDENT)
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('building') building?: string,
    @Query('room') room?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<Awaited<ReturnType<UtilityBillsService['findAll']>>> {
    return this.utilityBillsService.findAll(
      {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        search: search?.trim() || undefined,
        building: building?.trim() || undefined,
        room: room?.trim() || undefined,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        status: status?.trim() || undefined,
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
  ): Promise<Awaited<ReturnType<UtilityBillsService['findOne']>>> {
    const billId = Number(id);
    if (Number.isNaN(billId)) {
      throw new BadRequestException('Invalid utility bill id.');
    }
    return this.utilityBillsService.findOne(billId, req.user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async create(
    @Body() createUtilityBillDto: CreateUtilityBillDto,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<UtilityBillsService['create']>>> {
    return this.utilityBillsService.create(createUtilityBillDto, req.user);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() updateUtilityBillDto: UpdateUtilityBillDto,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<UtilityBillsService['update']>>> {
    const billId = Number(id);
    if (Number.isNaN(billId)) {
      throw new BadRequestException('Invalid utility bill id.');
    }
    return this.utilityBillsService.update(
      billId,
      updateUtilityBillDto,
      req.user,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<UtilityBillsService['remove']>>> {
    const billId = Number(id);
    if (Number.isNaN(billId)) {
      throw new BadRequestException('Invalid utility bill id.');
    }
    return this.utilityBillsService.remove(billId, req.user);
  }
}
