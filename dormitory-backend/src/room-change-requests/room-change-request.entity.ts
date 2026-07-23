import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Student } from '../students/student.entity';
import { Room } from '../rooms/room.entity';
import { User } from '../users/user.entity';
import { RoomChangeStatus } from '../common/enums/user-role.enum';

@Entity('room_change_requests')
export class RoomChangeRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'student_id', type: 'int' })
  studentId!: number;

  @Column({ name: 'current_room_id', type: 'int' })
  currentRoomId!: number;

  @Column({ name: 'requested_room_id', type: 'int' })
  requestedRoomId!: number;

  @Column({ name: 'reason', type: 'text' })
  reason!: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: RoomChangeStatus.PENDING,
  })
  status!: RoomChangeStatus;

  @Column({ name: 'approved_by', type: 'int', nullable: true })
  approvedBy!: number | null;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  @ManyToOne(() => Student, (student) => student.roomChangeRequests, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'student_id' })
  student!: Student;

  @ManyToOne(() => Room, (room) => room.currentRoomChangeRequests, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'current_room_id' })
  currentRoom!: Room;

  @ManyToOne(() => Room, (room) => room.requestedRoomChangeRequests, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'requested_room_id' })
  requestedRoom!: Room;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'approved_by' })
  approver!: User | null;
}
