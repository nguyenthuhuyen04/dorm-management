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
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('gender') gender: string,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<BuildingsService['findAll']>>> {
    const query = {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      search,
      gender,
    };
    return this.buildingsService.findAll(query, req.user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<BuildingsService['findOne']>>> {
    const buildingId = Number(id);
    if (Number.isNaN(buildingId)) {
      throw new BadRequestException('Invalid building id.');
    }
    return this.buildingsService.findOne(buildingId, req.user);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @Body() createBuildingDto: CreateBuildingDto,
  ): Promise<Awaited<ReturnType<BuildingsService['create']>>> {
    return this.buildingsService.create(createBuildingDto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateBuildingDto: UpdateBuildingDto,
  ): Promise<Awaited<ReturnType<BuildingsService['update']>>> {
    const buildingId = Number(id);
    if (Number.isNaN(buildingId)) {
      throw new BadRequestException('Invalid building id.');
    }
    return this.buildingsService.update(buildingId, updateBuildingDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
  ): Promise<Awaited<ReturnType<BuildingsService['remove']>>> {
    const buildingId = Number(id);
    if (Number.isNaN(buildingId)) {
      throw new BadRequestException('Invalid building id.');
    }
    return this.buildingsService.remove(buildingId);
  }
}
