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
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STUDENT)
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('building') building?: string,
    @Query('room') room?: string,
    @Query('student') student?: string,
    @Query('manager') manager?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('created_at') createdAt?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<Awaited<ReturnType<ContractsService['findAll']>>> {
    return this.contractsService.findAll(
      {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        search: search?.trim() || undefined,
        status: status?.trim() || undefined,
        building: building?.trim() || undefined,
        room: room?.trim() || undefined,
        student: student?.trim() || undefined,
        manager: manager?.trim() || undefined,
        start_date: startDate?.trim() || undefined,
        end_date: endDate?.trim() || undefined,
        created_at: createdAt?.trim() || undefined,
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
  ): Promise<Awaited<ReturnType<ContractsService['findOne']>>> {
    const contractId = Number(id);
    if (Number.isNaN(contractId)) {
      throw new BadRequestException('Invalid contract id.');
    }
    return this.contractsService.findOne(contractId, req.user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async create(
    @Body() createContractDto: CreateContractDto,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<ContractsService['create']>>> {
    return this.contractsService.create(createContractDto, req.user);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() updateContractDto: UpdateContractDto,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<ContractsService['update']>>> {
    const contractId = Number(id);
    if (Number.isNaN(contractId)) {
      throw new BadRequestException('Invalid contract id.');
    }
    return this.contractsService.update(
      contractId,
      updateContractDto,
      req.user,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<ContractsService['remove']>>> {
    const contractId = Number(id);
    if (Number.isNaN(contractId)) {
      throw new BadRequestException('Invalid contract id.');
    }
    return this.contractsService.remove(contractId, req.user);
  }
}
