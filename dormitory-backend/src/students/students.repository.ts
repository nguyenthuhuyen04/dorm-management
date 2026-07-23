import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Contract } from '../contracts/contract.entity';
import { Payment } from '../payments/payment.entity';
import { RoomChangeRequest } from '../room-change-requests/room-change-request.entity';
import { SupportRequest } from '../support-requests/support-request.entity';
import { ContractStatus } from '../common/enums/user-role.enum';
import { Student } from './student.entity';

@Injectable()
export class StudentsRepository extends Repository<Student> {
  constructor(dataSource: DataSource) {
    super(Student, dataSource.createEntityManager());
  }

  async findById(id: number): Promise<Student | null> {
    return this.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findByStudentCode(studentCode: string): Promise<Student | null> {
    return this.createQueryBuilder('student')
      .where('LOWER(student.studentCode) = LOWER(:studentCode)', {
        studentCode,
      })
      .getOne();
  }

  async findByUserId(userId: number): Promise<Student | null> {
    return this.findOne({ where: { userId }, relations: ['user'] });
  }

  async managerQueryHasAccessToStudent(
    studentId: number,
    managerId: number,
  ): Promise<boolean> {
    const result = await this.manager.query(
      `SELECT EXISTS(
        SELECT 1
        FROM students s
        INNER JOIN contracts c ON c.student_id = s.id
        INNER JOIN rooms r ON r.id = c.room_id
        INNER JOIN buildings b ON b.id = r.building_id
        WHERE s.id = ? AND b.manager_id = ?
      ) AS has_access`,
      [studentId, managerId],
    );

    return Boolean(Number(result?.[0]?.has_access ?? 0));
  }

  async hasActiveContractForStudent(studentId: number): Promise<boolean> {
    const count = await this.manager.getRepository(Contract).count({
      where: { studentId, status: ContractStatus.ACTIVE },
    });
    return count > 0;
  }

  async hasPaymentForStudent(studentId: number): Promise<boolean> {
    const count = await this.manager.getRepository(Payment).count({
      where: { studentId },
    });
    return count > 0;
  }

  async hasRoomChangeRequestForStudent(studentId: number): Promise<boolean> {
    const count = await this.manager.getRepository(RoomChangeRequest).count({
      where: { studentId },
    });
    return count > 0;
  }

  async hasSupportRequestForStudent(studentId: number): Promise<boolean> {
    const count = await this.manager.getRepository(SupportRequest).count({
      where: { studentId },
    });
    return count > 0;
  }
}
