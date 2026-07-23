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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STUDENT)
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('status') status?: string,
    @Query('room_id') roomId?: string,
    @Query('student_id') studentId?: string,
    @Query('payment_method') paymentMethod?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<Awaited<ReturnType<PaymentsService['findAll']>>> {
    return this.paymentsService.findAll(
      {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        search: search?.trim() || undefined,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        status: status?.trim() || undefined,
        room_id: roomId ? Number(roomId) : undefined,
        student_id: studentId ? Number(studentId) : undefined,
        payment_method: paymentMethod?.trim() || undefined,
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
  ): Promise<Awaited<ReturnType<PaymentsService['findOne']>>> {
    const paymentId = Number(id);
    if (Number.isNaN(paymentId)) {
      throw new BadRequestException('Invalid payment id.');
    }
    return this.paymentsService.findOne(paymentId, req.user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<PaymentsService['create']>>> {
    return this.paymentsService.create(createPaymentDto, req.user);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<PaymentsService['update']>>> {
    const paymentId = Number(id);
    if (Number.isNaN(paymentId)) {
      throw new BadRequestException('Invalid payment id.');
    }
    return this.paymentsService.update(paymentId, updatePaymentDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Awaited<ReturnType<PaymentsService['remove']>>> {
    const paymentId = Number(id);
    if (Number.isNaN(paymentId)) {
      throw new BadRequestException('Invalid payment id.');
    }
    return this.paymentsService.remove(paymentId, req.user);
  }
}
