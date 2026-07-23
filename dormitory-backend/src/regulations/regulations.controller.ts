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
import { RegulationsService } from './regulations.service';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { UpdateRegulationDto } from './dto/update-regulation.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('regulations')
export class RegulationsController {
  constructor(private readonly regulationsService: RegulationsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STUDENT)
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('created_by') createdBy?: string,
  ): Promise<Awaited<ReturnType<RegulationsService['findAll']>>> {
    return this.regulationsService.findAll(
      {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        search: search?.trim() || undefined,
        created_by: createdBy?.trim() || undefined,
      },
      req.user,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STUDENT)
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<RegulationsService['findOne']>>> {
    const regulationId = Number(id);
    if (Number.isNaN(regulationId)) {
      throw new BadRequestException('Invalid regulation id.');
    }
    return this.regulationsService.findOne(regulationId, req.user);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @Body() createRegulationDto: CreateRegulationDto,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<RegulationsService['create']>>> {
    return this.regulationsService.create(createRegulationDto, req.user);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateRegulationDto: UpdateRegulationDto,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<RegulationsService['update']>>> {
    const regulationId = Number(id);
    if (Number.isNaN(regulationId)) {
      throw new BadRequestException('Invalid regulation id.');
    }
    return this.regulationsService.update(
      regulationId,
      updateRegulationDto,
      req.user,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<RegulationsService['remove']>>> {
    const regulationId = Number(id);
    if (Number.isNaN(regulationId)) {
      throw new BadRequestException('Invalid regulation id.');
    }
    return this.regulationsService.remove(regulationId, req.user);
  }
}
