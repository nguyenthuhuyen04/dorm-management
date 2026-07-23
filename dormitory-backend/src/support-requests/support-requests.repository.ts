import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SupportRequest } from './support-request.entity';
import { Student } from '../students/student.entity';
import { Room } from '../rooms/room.entity';
import { User } from '../users/user.entity';
import { SupportStatus } from '../common/enums/user-role.enum';

@Injectable()
export class SupportRequestsRepository extends Repository<SupportRequest> {
  constructor(dataSource: DataSource) {
    super(SupportRequest, dataSource.createEntityManager());
  }

  async findById(id: number): Promise<SupportRequest | null> {
    return this.findOne({
      where: { id },
      relations: [
        'student',
        'student.user',
        'room',
        'room.building',
        'handler',
      ],
    });
  }

  async findByStudent(studentId: number): Promise<SupportRequest[]> {
    return this.find({
      where: { studentId },
      relations: [
        'student',
        'student.user',
        'room',
        'room.building',
        'handler',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findByRoom(roomId: number): Promise<SupportRequest[]> {
    return this.find({
      where: { roomId },
      relations: [
        'student',
        'student.user',
        'room',
        'room.building',
        'handler',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findByBuilding(buildingId: number): Promise<SupportRequest[]> {
    return this.createQueryBuilder('support_request')
      .leftJoinAndSelect('support_request.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('support_request.room', 'room')
      .leftJoinAndSelect('room.building', 'building')
      .leftJoinAndSelect('support_request.handler', 'handler')
      .where('building.id = :buildingId', { buildingId })
      .orderBy('support_request.createdAt', 'DESC')
      .getMany();
  }

  async findPending(): Promise<SupportRequest[]> {
    return this.find({
      where: { status: SupportStatus.PENDING },
      relations: [
        'student',
        'student.user',
        'room',
        'room.building',
        'handler',
      ],
      order: { createdAt: 'ASC' },
    });
  }

  async findProcessing(): Promise<SupportRequest[]> {
    return this.find({
      where: { status: SupportStatus.PROCESSING },
      relations: [
        'student',
        'student.user',
        'room',
        'room.building',
        'handler',
      ],
      order: { createdAt: 'ASC' },
    });
  }

  async findDone(): Promise<SupportRequest[]> {
    return this.find({
      where: { status: SupportStatus.DONE },
      relations: [
        'student',
        'student.user',
        'room',
        'room.building',
        'handler',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async managerHasBuildingAccess(
    requestId: number,
    managerId: number,
  ): Promise<boolean> {
    const result = await this.manager.query(
      `SELECT EXISTS(
        SELECT 1
        FROM support_requests sr
        INNER JOIN rooms r ON r.id = sr.room_id
        INNER JOIN buildings b ON b.id = r.building_id
        WHERE sr.id = ? AND b.manager_id = ?
      ) AS has_access`,
      [requestId, managerId],
    );
    return Boolean(Number(result?.[0]?.has_access ?? 0));
  }

  async studentHasAccess(
    requestId: number,
    studentId: number,
  ): Promise<boolean> {
    const result = await this.manager.query(
      `SELECT EXISTS(
        SELECT 1
        FROM support_requests sr
        WHERE sr.id = ? AND sr.student_id = ?
      ) AS has_access`,
      [requestId, studentId],
    );
    return Boolean(Number(result?.[0]?.has_access ?? 0));
  }
}