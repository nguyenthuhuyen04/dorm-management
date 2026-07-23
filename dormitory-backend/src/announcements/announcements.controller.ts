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
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STUDENT)
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('target_role') targetRole?: string,
    @Query('created_by') createdBy?: string,
  ): Promise<Awaited<ReturnType<AnnouncementsService['findAll']>>> {
    return this.announcementsService.findAll(
      {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        search: search?.trim() || undefined,
        target_role: targetRole?.trim() || undefined,
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
  ): Promise<Awaited<ReturnType<AnnouncementsService['findOne']>>> {
    const announcementId = Number(id);
    if (Number.isNaN(announcementId)) {
      throw new BadRequestException('Invalid announcement id.');
    }
    return this.announcementsService.findOne(announcementId, req.user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async create(
    @Body() createAnnouncementDto: CreateAnnouncementDto,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<AnnouncementsService['create']>>> {
    return this.announcementsService.create(createAnnouncementDto, req.user);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<AnnouncementsService['update']>>> {
    const announcementId = Number(id);
    if (Number.isNaN(announcementId)) {
      throw new BadRequestException('Invalid announcement id.');
    }
    return this.announcementsService.update(
      announcementId,
      updateAnnouncementDto,
      req.user,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<AnnouncementsService['remove']>>> {
    const announcementId = Number(id);
    if (Number.isNaN(announcementId)) {
      throw new BadRequestException('Invalid announcement id.');
    }
    return this.announcementsService.remove(announcementId, req.user);
  }
}
