import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Student } from '../students/student.entity';
import { Room } from '../rooms/room.entity';
import { User } from '../users/user.entity';
import { SupportStatus } from '../common/enums/user-role.enum';

@Entity('support_requests')
export class SupportRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'student_id', type: 'int' })
  studentId!: number;

  @Column({ name: 'room_id', type: 'int' })
  roomId!: number;

  @Column({ name: 'category', type: 'varchar', length: 30 })
  category!: string;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'description', type: 'text' })
  description!: string;

  @Column({ name: 'reply', type: 'text', nullable: true })
  reply!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: SupportStatus.PENDING })
  status!: SupportStatus;

  @Column({ name: 'handled_by', type: 'int', nullable: true })
  handledBy!: number | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @ManyToOne(() => Student, (student) => student.supportRequests)
  @JoinColumn({ name: 'student_id' })
  student!: Student;

  @ManyToOne(() => Room, (room) => room.supportRequests)
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'handled_by' })
  handler!: User | null;
}
