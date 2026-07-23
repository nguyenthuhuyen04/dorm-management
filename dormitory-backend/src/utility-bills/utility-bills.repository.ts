import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UtilityBill } from './utility-bill.entity';

@Injectable()
export class UtilityBillsRepository extends Repository<UtilityBill> {
  constructor(dataSource: DataSource) {
    super(UtilityBill, dataSource.createEntityManager());
  }

  async findById(id: number): Promise<UtilityBill | null> {
    return this.findOne({
      where: { id },
      relations: ['room', 'room.building', 'creator', 'payments'],
    });
  }

  async findByRoomAndMonth(
    roomId: number,
    month: number,
    year: number,
  ): Promise<UtilityBill | null> {
    return this.findOne({
      where: { roomId, month, year },
    });
  }

  async managerHasBuildingAccess(
    billId: number,
    managerId: number,
  ): Promise<boolean> {
    const result = await this.manager.query(
      `SELECT EXISTS(
        SELECT 1
        FROM utility_bills ub
        INNER JOIN rooms r ON r.id = ub.room_id
        INNER JOIN buildings b ON b.id = r.building_id
        WHERE ub.id = ? AND b.manager_id = ?
      ) AS has_access`,
      [billId, managerId],
    );
    return Boolean(Number(result?.[0]?.has_access ?? 0));
  }

  async findByRoomId(roomId: number): Promise<UtilityBill[]> {
    return this.find({
      where: { roomId },
      relations: ['room', 'creator'],
      order: { year: 'DESC', month: 'DESC' },
    });
  }

  async getActiveUtilityBillsForRoom(roomId: number): Promise<UtilityBill[]> {
    return this.find({
      where: { roomId },
      order: { year: 'DESC', month: 'DESC' },
    });
  }

  async studentHasBillAccess(billId: number, userId: number): Promise<boolean> {
    const result = await this.manager.query(
      `SELECT EXISTS(
        SELECT 1
        FROM utility_bills ub
        INNER JOIN rooms r ON r.id = ub.room_id
        INNER JOIN contracts c ON c.room_id = r.id AND c.status = 'ACTIVE'
        INNER JOIN students s ON s.id = c.student_id
        WHERE ub.id = ? AND s.user_id = ?
      ) AS has_access`,
      [billId, userId],
    );
    return Boolean(Number(result?.[0]?.has_access ?? 0));
  }
}
