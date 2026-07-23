import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaymentsRepository } from './payments.repository';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './payment.entity';
import { Student } from '../students/student.entity';
import { Contract } from '../contracts/contract.entity';
import { UtilityBill } from '../utility-bills/utility-bill.entity';
import { User, UserRole } from '../users/user.entity';
import { PaymentStatus, ContractStatus } from '../common/enums/user-role.enum';

interface AuthenticatedUser {
  userId: number;
  role: UserRole;
}

interface FindPaymentsQuery {
  page?: number;
  limit?: number;
  search?: string;
  month?: number;
  year?: number;
  status?: string;
  room_id?: number;
  student_id?: number;
  payment_method?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface PaymentResponse {
  id: number;
  invoiceCode: string;
  studentId: number;
  contractId: number;
  utilityBillId: number;
  month: number;
  year: number;
  roomFee: number;
  electricFee: number;
  waterFee: number;
  otherFee: number;
  totalAmount: number;
  dueDate: Date;
  paymentDate: Date | null;
  paymentMethod: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  student: {
    id: number;
    studentCode: string;
    gender: string | null;
    user: {
      id: number;
      fullName: string;
    } | null;
  } | null;
  contract: {
    id: number;
    contractCode: string;
  } | null;
  utilityBill: {
    id: number;
    month: number;
    year: number;
  } | null;
}

interface PaginatedPaymentsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: PaymentResponse[];
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  private toPaymentResponse(payment: Payment): PaymentResponse {
    return {
      id: payment.id,
      invoiceCode: payment.invoiceCode,
      studentId: payment.studentId,
      contractId: payment.contractId,
      utilityBillId: payment.utilityBillId,
      month: payment.month,
      year: payment.year,
      roomFee: Number(payment.roomFee),
      electricFee: Number(payment.electricFee),
      waterFee: Number(payment.waterFee),
      otherFee: Number(payment.otherFee),
      totalAmount: Number(payment.totalAmount),
      dueDate: payment.dueDate,
      paymentDate: payment.paymentDate ?? null,
      paymentMethod: payment.paymentMethod ?? null,
      status: payment.status,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      student: payment.student
        ? {
            id: payment.student.id,
            studentCode: payment.student.studentCode,
            gender: payment.student.gender ?? null,
            user: payment.student.user
              ? {
                  id: payment.student.user.id,
                  fullName: payment.student.user.fullName,
                }
              : null,
          }
        : null,
      contract: payment.contract
        ? {
            id: payment.contract.id,
            contractCode: payment.contract.contractCode,
          }
        : null,
      utilityBill: payment.utilityBill
        ? {
            id: payment.utilityBill.id,
            month: payment.utilityBill.month,
            year: payment.utilityBill.year,
          }
        : null,
    };
  }

  async findAll(
    query: FindPaymentsQuery,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedPaymentsResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('payment.contract', 'contract')
      .leftJoinAndSelect('contract.room', 'room')
      .leftJoinAndSelect('room.building', 'building')
      .leftJoinAndSelect('payment.utilityBill', 'utilityBill');

    // Role-based scoping
    if (currentUser.role === UserRole.STUDENT) {
      queryBuilder.andWhere('student.userId = :userId', {
        userId: currentUser.userId,
      });
    } else if (currentUser.role === UserRole.MANAGER) {
      queryBuilder.andWhere('building.manager_id = :managerId', {
        managerId: currentUser.userId,
      });
    }

    // Search
    if (query.search) {
      const search = `%${query.search.toLowerCase()}%`;
      queryBuilder.andWhere(
        '(LOWER(payment.invoiceCode) LIKE :search OR LOWER(student.studentCode) LIKE :search OR LOWER(studentUser.fullName) LIKE :search OR LOWER(room.roomNumber) LIKE :search OR LOWER(building.buildingName) LIKE :search)',
        { search },
      );
    }

    // Filters
    if (query.month) {
      queryBuilder.andWhere('payment.month = :month', {
        month: query.month,
      });
    }

    if (query.year) {
      queryBuilder.andWhere('payment.year = :year', {
        year: query.year,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('payment.status = :status', {
        status: query.status,
      });
    }

    if (query.payment_method) {
      queryBuilder.andWhere('payment.paymentMethod = :paymentMethod', {
        paymentMethod: query.payment_method,
      });
    }

    if (query.student_id) {
      queryBuilder.andWhere('payment.studentId = :studentId', {
        studentId: query.student_id,
      });
    }

    if (query.room_id) {
      queryBuilder.andWhere('contract.roomId = :roomId', {
        roomId: query.room_id,
      });
    }

    // Sorting
    const allowedSortBy = new Set([
      'id',
      'invoiceCode',
      'month',
      'year',
      'roomFee',
      'electricFee',
      'waterFee',
      'otherFee',
      'totalAmount',
      'dueDate',
      'paymentDate',
      'status',
      'createdAt',
    ]);
    const sortBy = allowedSortBy.has(query.sortBy ?? '')
      ? (query.sortBy as string)
      : 'id';
    const sortOrder = query.sortOrder === 'DESC' ? 'DESC' : 'ASC';
    queryBuilder.orderBy(`payment.${sortBy}`, sortOrder);

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      data: data.map((payment) => this.toPaymentResponse(payment)),
    };
  }

  async findOne(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<PaymentResponse> {
    const payment = await this.paymentsRepository.findById(id);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Role-based access
    if (currentUser.role === UserRole.STUDENT) {
      const hasAccess = await this.paymentsRepository.studentHasPaymentAccess(
        id,
        currentUser.userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    } else if (currentUser.role === UserRole.MANAGER) {
      const hasAccess = await this.paymentsRepository.managerHasBuildingAccess(
        id,
        currentUser.userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.toPaymentResponse(payment);
  }

  async create(
    createPaymentDto: CreatePaymentDto,
    currentUser: AuthenticatedUser,
  ): Promise<PaymentResponse> {
    // Validate student exists
    const student = await this.dataSource.manager.findOne(Student, {
      where: { id: createPaymentDto.student_id },
      relations: ['user'],
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Validate contract exists
    const contract = await this.dataSource.manager.findOne(Contract, {
      where: { id: createPaymentDto.contract_id },
      relations: ['room', 'room.building', 'room.building.manager'],
    });
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Validate utility bill exists
    const utilityBill = await this.dataSource.manager.findOne(UtilityBill, {
      where: { id: createPaymentDto.utility_bill_id },
      relations: ['room'],
    });
    if (!utilityBill) {
      throw new NotFoundException('Utility bill not found');
    }

    // Contract must belong to student
    if (contract.studentId !== student.id) {
      throw new BadRequestException('Contract does not belong to this student');
    }

    // Utility bill must belong to the same room as the contract
    if (utilityBill.roomId !== contract.roomId) {
      throw new BadRequestException(
        'Utility bill does not belong to the room of this contract',
      );
    }

    // Manager can only create payments in their managed building
    if (currentUser.role === UserRole.MANAGER) {
      if (
        !contract.room.building?.manager ||
        contract.room.building.manager.id !== currentUser.userId
      ) {
        throw new ForbiddenException(
          'You can only create payments in your managed building',
        );
      }
    }

    // Check invoice_code uniqueness
    const existingInvoice = await this.paymentsRepository.findByInvoiceCode(
      createPaymentDto.invoice_code,
    );
    if (existingInvoice) {
      throw new ConflictException('invoice_code already exists');
    }

    // Validate month/year
    if (createPaymentDto.month < 1 || createPaymentDto.month > 12) {
      throw new BadRequestException('month must be between 1 and 12');
    }
    if (createPaymentDto.year < 2000) {
      throw new BadRequestException('year must be 2000 or later');
    }

    // Calculate total_amount
    const roomFee = Number(createPaymentDto.room_fee);
    const electricFee = Number(createPaymentDto.electric_fee ?? 0);
    const waterFee = Number(createPaymentDto.water_fee ?? 0);
    const otherFee = Number(createPaymentDto.other_fee ?? 0);
    const calculatedTotal = roomFee + electricFee + waterFee + otherFee;
    const providedTotal = Number(createPaymentDto.total_amount);

    if (Math.abs(calculatedTotal - providedTotal) > 0.01) {
      throw new BadRequestException(
        `total_amount must equal room_fee + electric_fee + water_fee + other_fee (${calculatedTotal})`,
      );
    }

    // Set status defaults
    const status = createPaymentDto.status ?? PaymentStatus.UNPAID;
    const paymentDate =
      status === PaymentStatus.PAID
        ? (createPaymentDto.payment_date ?? new Date())
        : null;

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const paymentRepo = transactionalEntityManager.getRepository(Payment);

        const payment = paymentRepo.create({
          invoiceCode: createPaymentDto.invoice_code,
          studentId: student.id,
          contractId: contract.id,
          utilityBillId: utilityBill.id,
          month: createPaymentDto.month,
          year: createPaymentDto.year,
          roomFee,
          electricFee,
          waterFee,
          otherFee,
          totalAmount: calculatedTotal,
          dueDate: createPaymentDto.due_date,
          paymentDate,
          paymentMethod: createPaymentDto.payment_method ?? null,
          status,
        });

        const savedPayment = await paymentRepo.save(payment);

        const fullPayment = await paymentRepo.findOne({
          where: { id: savedPayment.id },
          relations: [
            'student',
            'student.user',
            'contract',
            'contract.room',
            'contract.room.building',
            'utilityBill',
          ],
        });

        if (!fullPayment) {
          throw new NotFoundException('Payment not found after creation');
        }

        return this.toPaymentResponse(fullPayment);
      },
    );
  }

  async update(
    id: number,
    updatePaymentDto: UpdatePaymentDto,
    currentUser: AuthenticatedUser,
  ): Promise<PaymentResponse> {
    const payment = await this.paymentsRepository.findById(id);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Cannot update PAID payment
    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException(
        'Cannot update a payment that is already PAID',
      );
    }

    // Role-based access for MANAGER
    if (currentUser.role === UserRole.MANAGER) {
      const hasAccess = await this.paymentsRepository.managerHasBuildingAccess(
        id,
        currentUser.userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    }

    // If changing student_id, validate
    if (updatePaymentDto.student_id !== undefined) {
      const student = await this.dataSource.manager.findOne(Student, {
        where: { id: updatePaymentDto.student_id },
      });
      if (!student) {
        throw new NotFoundException('Student not found');
      }
      payment.studentId = updatePaymentDto.student_id;
    }

    // If changing contract_id, validate
    if (updatePaymentDto.contract_id !== undefined) {
      const contract = await this.dataSource.manager.findOne(Contract, {
        where: { id: updatePaymentDto.contract_id },
        relations: ['room', 'room.building', 'room.building.manager'],
      });
      if (!contract) {
        throw new NotFoundException('Contract not found');
      }

      // Manager validation for new contract
      if (currentUser.role === UserRole.MANAGER) {
        if (
          !contract.room.building?.manager ||
          contract.room.building.manager.id !== currentUser.userId
        ) {
          throw new ForbiddenException(
            'You can only update payments within your managed building',
          );
        }
      }

      payment.contractId = updatePaymentDto.contract_id;
    }

    // If changing utility_bill_id, validate
    if (updatePaymentDto.utility_bill_id !== undefined) {
      const utilityBill = await this.dataSource.manager.findOne(UtilityBill, {
        where: { id: updatePaymentDto.utility_bill_id },
      });
      if (!utilityBill) {
        throw new NotFoundException('Utility bill not found');
      }
      payment.utilityBillId = updatePaymentDto.utility_bill_id;
    }

    // If changing invoice_code, check uniqueness
    if (updatePaymentDto.invoice_code !== undefined) {
      const existing = await this.paymentsRepository.findByInvoiceCode(
        updatePaymentDto.invoice_code,
      );
      if (existing && existing.id !== id) {
        throw new ConflictException('invoice_code already exists');
      }
      payment.invoiceCode = updatePaymentDto.invoice_code;
    }

    // Apply field updates
    if (updatePaymentDto.month !== undefined) {
      if (updatePaymentDto.month < 1 || updatePaymentDto.month > 12) {
        throw new BadRequestException('month must be between 1 and 12');
      }
      payment.month = updatePaymentDto.month;
    }

    if (updatePaymentDto.year !== undefined) {
      if (updatePaymentDto.year < 2000) {
        throw new BadRequestException('year must be 2000 or later');
      }
      payment.year = updatePaymentDto.year;
    }

    if (updatePaymentDto.room_fee !== undefined) {
      payment.roomFee = updatePaymentDto.room_fee;
    }
    if (updatePaymentDto.electric_fee !== undefined) {
      payment.electricFee = updatePaymentDto.electric_fee;
    }
    if (updatePaymentDto.water_fee !== undefined) {
      payment.waterFee = updatePaymentDto.water_fee;
    }
    if (updatePaymentDto.other_fee !== undefined) {
      payment.otherFee = updatePaymentDto.other_fee;
    }
    if (updatePaymentDto.due_date !== undefined) {
      payment.dueDate = updatePaymentDto.due_date;
    }
    if (updatePaymentDto.payment_method !== undefined) {
      payment.paymentMethod = updatePaymentDto.payment_method;
    }

    // Handle status change
    if (updatePaymentDto.status !== undefined) {
      const newStatus = updatePaymentDto.status;
      if (newStatus === PaymentStatus.PAID) {
        payment.paymentDate = updatePaymentDto.payment_date ?? new Date();
      } else {
        payment.paymentDate = null;
      }
      payment.status = newStatus;
    }

    // Recalculate total_amount if any fee changed
    if (
      updatePaymentDto.room_fee !== undefined ||
      updatePaymentDto.electric_fee !== undefined ||
      updatePaymentDto.water_fee !== undefined ||
      updatePaymentDto.other_fee !== undefined
    ) {
      const recalculatedTotal =
        Number(payment.roomFee) +
        Number(payment.electricFee) +
        Number(payment.waterFee) +
        Number(payment.otherFee);

      if (updatePaymentDto.total_amount !== undefined) {
        if (
          Math.abs(Number(updatePaymentDto.total_amount) - recalculatedTotal) >
          0.01
        ) {
          throw new BadRequestException(
            `total_amount must equal room_fee + electric_fee + water_fee + other_fee (${recalculatedTotal})`,
          );
        }
        payment.totalAmount = updatePaymentDto.total_amount;
      } else {
        payment.totalAmount = recalculatedTotal;
      }
    } else if (updatePaymentDto.total_amount !== undefined) {
      payment.totalAmount = updatePaymentDto.total_amount;
    }

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const paymentRepo = transactionalEntityManager.getRepository(Payment);
        await paymentRepo.save(payment);

        const updatedPayment = await paymentRepo.findOne({
          where: { id },
          relations: [
            'student',
            'student.user',
            'contract',
            'contract.room',
            'contract.room.building',
            'utilityBill',
          ],
        });

        if (!updatedPayment) {
          throw new NotFoundException('Payment not found after update');
        }

        return this.toPaymentResponse(updatedPayment);
      },
    );
  }

  async remove(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const payment = await this.paymentsRepository.findById(id);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Cannot delete PAID payment
    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException(
        'Cannot delete a payment that is already PAID',
      );
    }

    // Role-based access for MANAGER
    if (currentUser.role === UserRole.MANAGER) {
      const hasAccess = await this.paymentsRepository.managerHasBuildingAccess(
        id,
        currentUser.userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    }

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const paymentRepo = transactionalEntityManager.getRepository(Payment);
        await paymentRepo.delete(id);

        return { message: 'Payment deleted successfully' };
      },
    );
  }
}
