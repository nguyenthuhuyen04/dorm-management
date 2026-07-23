import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Contract } from '../contracts/contract.entity';
import { Payment } from '../payments/payment.entity';
import { SupportRequest } from '../support-requests/support-request.entity';
import { RoomChangeRequest } from '../room-change-requests/room-change-request.entity';
import { Gender } from '../common/enums/user-role.enum';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int', unique: true })
  userId!: number;

  @Column({ name: 'student_code', type: 'varchar', length: 20, unique: true })
  studentCode!: string;

  @Column({ name: 'gender', type: 'varchar', length: 10, nullable: true })
  gender!: Gender | null;

  @Column({ name: 'birthday', type: 'date', nullable: true })
  birthday!: Date | null;

  @Column({ name: 'faculty', type: 'varchar', length: 100, nullable: true })
  faculty!: string | null;

  @Column({ name: 'class_name', type: 'varchar', length: 50, nullable: true })
  className!: string | null;

  @Column({ name: 'address', type: 'text', nullable: true })
  address!: string | null;

  @Column({ name: 'parent_phone', type: 'varchar', length: 15, nullable: true })
  parentPhone!: string | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @OneToOne(() => User, (user) => user.student, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => Contract, (contract) => contract.student)
  contracts!: Contract[];

  @OneToMany(() => Payment, (payment) => payment.student)
  payments!: Payment[];

  @OneToMany(() => SupportRequest, (supportRequest) => supportRequest.student)
  supportRequests!: SupportRequest[];

  @OneToMany(() => RoomChangeRequest, (roomChangeRequest) => roomChangeRequest.student)
  roomChangeRequests!: RoomChangeRequest[];
}
