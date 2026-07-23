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
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STUDENT)
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('student_code') studentCode?: string,
    @Query('faculty') faculty?: string,
    @Query('class_name') className?: string,
    @Query('gender') gender?: string,
    @Query('building') building?: string,
    @Query('room') room?: string,
    @Query('course') course?: string,
    @Query('status') status?: string,
  ): Promise<Awaited<ReturnType<StudentsService['findAll']>>> {
    return this.studentsService.findAll(
      {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        search: search?.trim() || undefined,
        studentCode: studentCode?.trim() || undefined,
        faculty: faculty?.trim() || undefined,
        className: className?.trim() || undefined,
        gender: gender?.trim() || undefined,
        building: building?.trim() || undefined,
        room: room?.trim() || undefined,
        course: course?.trim() || undefined,
        status: status?.trim() || undefined,
      },
      req.user,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STUDENT)
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<StudentsService['findOne']>>> {
    const studentId = Number(id);
    if (Number.isNaN(studentId)) {
      throw new BadRequestException('Invalid student id.');
    }
    return this.studentsService.findOne(studentId, req.user);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @Body() createStudentDto: CreateStudentDto,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<StudentsService['create']>>> {
    return this.studentsService.create(createStudentDto, req.user);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  async update(
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<StudentsService['update']>>> {
    const studentId = Number(id);
    if (Number.isNaN(studentId)) {
      throw new BadRequestException('Invalid student id.');
    }
    return this.studentsService.update(studentId, updateStudentDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<StudentsService['remove']>>> {
    const studentId = Number(id);
    if (Number.isNaN(studentId)) {
      throw new BadRequestException('Invalid student id.');
    }
    return this.studentsService.remove(studentId, req.user);
  }
}
