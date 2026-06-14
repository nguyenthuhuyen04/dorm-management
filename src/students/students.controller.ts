import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const student = await this.studentsService.findOne(id);
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    const student = await this.studentsService.update(id, updateStudentDto);
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const student = await this.studentsService.remove(id);
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }
}
