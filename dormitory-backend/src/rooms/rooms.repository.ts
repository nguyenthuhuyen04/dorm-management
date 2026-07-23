import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Room } from './room.entity';
import { ContractStatus } from '../common/enums/user-role.enum';

@Injectable()
export class RoomsRepository extends Repository<Room> {
  constructor(dataSource: DataSource) {
    super(Room, dataSource.createEntityManager());
  }

  async findById(id: number): Promise<Room | null> {
    return this.findOne({
      where: { id },
      relations: [
        'building',
        'building.manager',
        'contracts',
        'contracts.student',
      ],
    });
  }

  async findByBuildingAndRoomNumber(
    buildingId: number,
    roomNumber: string,
  ): Promise<Room | null> {
    return this.findOne({
      where: {
        buildingId,
        roomNumber,
      },
    });
  }

  async getActiveOccupancy(roomId: number): Promise<number> {
    const result = await this.manager.query(
      'SELECT COUNT(*) AS count FROM contracts WHERE room_id = ? AND status = ?',
      [roomId, ContractStatus.ACTIVE],
    );

    return Number(result?.[0]?.count ?? 0);
  }

  async countActiveContracts(roomId: number): Promise<number> {
    const result = await this.manager.query(
      'SELECT COUNT(*) AS count FROM contracts WHERE room_id = ? AND status = ?',
      [roomId, ContractStatus.ACTIVE],
    );
    return Number(result?.[0]?.count ?? 0);
  }

  async countContracts(roomId: number): Promise<number> {
    const result = await this.manager.query(
      'SELECT COUNT(*) AS count FROM contracts WHERE room_id = ?',
      [roomId],
    );
    return Number(result?.[0]?.count ?? 0);
  }

  async hasStudentAccessToRoom(
    roomId: number,
    userId: number,
  ): Promise<boolean> {
    const result = await this.manager.query(
      `SELECT EXISTS(
        SELECT 1
        FROM contracts c
        INNER JOIN students s ON s.id = c.student_id
        WHERE c.room_id = ? AND c.status = ? AND s.user_id = ?
      ) AS has_access`,
      [roomId, ContractStatus.ACTIVE, userId],
    );

    return Boolean(Number(result?.[0]?.has_access ?? 0));
  }
}
