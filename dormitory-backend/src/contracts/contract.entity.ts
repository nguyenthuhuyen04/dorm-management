import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Student } from '../students/student.entity';
import { Room } from '../rooms/room.entity';
import { User } from '../users/user.entity';
import { Payment } from '../payments/payment.entity';
import { ContractStatus } from '../common/enums/user-role.enum';

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'contract_code', type: 'varchar', length: 20, unique: true })
  contractCode!: string;

  @Column({ name: 'student_id', type: 'int' })
  studentId!: number;

  @Column({ name: 'room_id', type: 'int' })
  roomId!: number;

  @Column({ name: 'created_by', type: 'int' })
  createdBy!: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: Date;

  @Column({
    name: 'deposit',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  deposit!: number;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: ContractStatus.ACTIVE,
  })
  status!: ContractStatus;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @ManyToOne(() => Student, (student) => student.contracts)
  @JoinColumn({ name: 'student_id' })
  student!: Student;

  @ManyToOne(() => Room, (room) => room.contracts)
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator!: User;

  @OneToMany(() => Payment, (payment) => payment.contract)
  payments!: Payment[];
}
