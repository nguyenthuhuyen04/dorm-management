import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RoomChangeRequest } from './room-change-request.entity';
import { User } from '../users/user.entity';
import { Room } from '../rooms/room.entity';
import { Student } from '../students/student.entity';
import { Contract } from '../contracts/contract.entity';
import { RoomChangeStatus } from '../common/enums/user-role.enum';

@Injectable()
export class RoomChangeRequestsRepository extends Repository<RoomChangeRequest> {
  constructor(dataSource: DataSource) {
    super(RoomChangeRequest, dataSource.createEntityManager());
  }

  async findById(id: number): Promise<RoomChangeRequest | null> {
    return this.findOne({
      where: { id },
      relations: [
        'student',
        'student.user',
        'currentRoom',
        'currentRoom.building',
        'requestedRoom',
        'requestedRoom.building',
        'approver',
      ],
    });
  }

  async hasPendingRequestForStudent(studentId: number): Promise<boolean> {
    const count = await this.count({
      where: { studentId, status: RoomChangeStatus.PENDING },
    });
    return count > 0;
  }

  async managerHasAccessToRequest(
    requestId: number,
    managerId: number,
  ): Promise<boolean> {
    const result = await this.manager.query(
      `SELECT EXISTS(
        SELECT 1
        FROM room_change_requests rcr
        INNER JOIN rooms current_room ON current_room.id = rcr.current_room_id
        INNER JOIN rooms requested_room ON requested_room.id = rcr.requested_room_id
        INNER JOIN buildings current_building ON current_building.id = current_room.building_id
        INNER JOIN buildings requested_building ON requested_building.id = requested_room.building_id
        WHERE rcr.id = ?
          AND (
            current_building.manager_id = ?
            OR requested_building.manager_id = ?
          )
      ) AS has_access`,
      [requestId, managerId, managerId],
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
        FROM room_change_requests rcr
        WHERE rcr.id = ? AND rcr.student_id = ?
      ) AS has_access`,
      [requestId, studentId],
    );
    return Boolean(Number(result?.[0]?.has_access ?? 0));
  }
}
