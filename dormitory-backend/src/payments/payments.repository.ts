import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Payment } from './payment.entity';

@Injectable()
export class PaymentsRepository extends Repository<Payment> {
  constructor(dataSource: DataSource) {
    super(Payment, dataSource.createEntityManager());
  }

  async findById(id: number): Promise<Payment | null> {
    return this.findOne({
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
  }

  async findByInvoiceCode(invoiceCode: string): Promise<Payment | null> {
    return this.findOne({ where: { invoiceCode } });
  }

  async findByStudent(studentId: number): Promise<Payment[]> {
    return this.find({
      where: { studentId },
      relations: [
        'student',
        'student.user',
        'contract',
        'contract.room',
        'contract.room.building',
        'utilityBill',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findByContract(contractId: number): Promise<Payment[]> {
    return this.find({
      where: { contractId },
      relations: [
        'student',
        'student.user',
        'contract',
        'contract.room',
        'contract.room.building',
        'utilityBill',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUtilityBill(utilityBillId: number): Promise<Payment[]> {
    return this.find({
      where: { utilityBillId },
      relations: [
        'student',
        'student.user',
        'contract',
        'contract.room',
        'contract.room.building',
        'utilityBill',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findByRoom(roomId: number): Promise<Payment[]> {
    return this.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('payment.contract', 'contract')
      .leftJoinAndSelect('contract.room', 'room')
      .leftJoinAndSelect('room.building', 'building')
      .leftJoinAndSelect('payment.utilityBill', 'utilityBill')
      .where('contract.roomId = :roomId', { roomId })
      .orderBy('payment.createdAt', 'DESC')
      .getMany();
  }

  async findByBuilding(buildingId: number): Promise<Payment[]> {
    return this.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('payment.contract', 'contract')
      .leftJoinAndSelect('contract.room', 'room')
      .leftJoinAndSelect('room.building', 'building')
      .leftJoinAndSelect('payment.utilityBill', 'utilityBill')
      .where('building.id = :buildingId', { buildingId })
      .orderBy('payment.createdAt', 'DESC')
      .getMany();
  }

  async findByRoomAndMonth(
    roomId: number,
    month: number,
    year: number,
  ): Promise<Payment | null> {
    return this.createQueryBuilder('payment')
      .leftJoin('payment.contract', 'contract')
      .where('contract.roomId = :roomId', { roomId })
      .andWhere('payment.month = :month', { month })
      .andWhere('payment.year = :year', { year })
      .getOne();
  }

  async managerHasBuildingAccess(
    paymentId: number,
    managerId: number,
  ): Promise<boolean> {
    const result = await this.manager.query(
      `SELECT EXISTS(
        SELECT 1
        FROM payments p
        INNER JOIN contracts c ON c.id = p.contract_id
        INNER JOIN rooms r ON r.id = c.room_id
        INNER JOIN buildings b ON b.id = r.building_id
        WHERE p.id = ? AND b.manager_id = ?
      ) AS has_access`,
      [paymentId, managerId],
    );
    return Boolean(Number(result?.[0]?.has_access ?? 0));
  }

  async studentHasPaymentAccess(
    paymentId: number,
    userId: number,
  ): Promise<boolean> {
    const result = await this.manager.query(
      `SELECT EXISTS(
        SELECT 1
        FROM payments p
        INNER JOIN students s ON s.id = p.student_id
        WHERE p.id = ? AND s.user_id = ?
      ) AS has_access`,
      [paymentId, userId],
    );
    return Boolean(Number(result?.[0]?.has_access ?? 0));
  }
}
