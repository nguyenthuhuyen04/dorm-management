import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Room } from '../rooms/room.entity';
import { User } from '../users/user.entity';
import { Payment } from '../payments/payment.entity';
import { UtilityBillStatus } from '../common/enums/user-role.enum';

@Entity('utility_bills')
@Unique(['roomId', 'month', 'year'])
export class UtilityBill {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'room_id', type: 'int' })
  roomId!: number;

  @Column({ name: 'month', type: 'tinyint' })
  month!: number;

  @Column({ name: 'year', type: 'smallint' })
  year!: number;

  @Column({ name: 'electric_old', type: 'int' })
  electricOld!: number;

  @Column({ name: 'electric_new', type: 'int' })
  electricNew!: number;

  @Column({ name: 'water_old', type: 'int' })
  waterOld!: number;

  @Column({ name: 'water_new', type: 'int' })
  waterNew!: number;

  @Column({
    name: 'electric_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  electricFee!: number;

  @Column({
    name: 'water_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  waterFee!: number;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: UtilityBillStatus.DRAFT,
  })
  status!: UtilityBillStatus;

  @Column({ name: 'created_by', type: 'int' })
  createdBy!: number;

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
  })
  updatedAt!: Date;

  @ManyToOne(() => Room, (room) => room.utilityBills)
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator!: User;

  @OneToMany(() => Payment, (payment) => payment.utilityBill)
  payments!: Payment[];
}
