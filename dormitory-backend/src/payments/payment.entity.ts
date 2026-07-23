import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Student } from '../students/student.entity';
import { Contract } from '../contracts/contract.entity';
import { UtilityBill } from '../utility-bills/utility-bill.entity';
import { PaymentStatus } from '../common/enums/user-role.enum';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'invoice_code', type: 'varchar', length: 20, unique: true })
  invoiceCode!: string;

  @Column({ name: 'student_id', type: 'int' })
  studentId!: number;

  @Column({ name: 'contract_id', type: 'int' })
  contractId!: number;

  @Column({ name: 'utility_bill_id', type: 'int' })
  utilityBillId!: number;

  @Column({ name: 'month', type: 'tinyint' })
  month!: number;

  @Column({ name: 'year', type: 'smallint' })
  year!: number;

  @Column({ name: 'room_fee', type: 'decimal', precision: 10, scale: 2 })
  roomFee!: number;

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
    name: 'other_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  otherFee!: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount!: number;

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: Date;

  @Column({ name: 'payment_date', type: 'datetime', nullable: true })
  paymentDate!: Date | null;

  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  paymentMethod!: string | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: PaymentStatus.UNPAID,
  })
  status!: PaymentStatus;

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

  @ManyToOne(() => Student, (student) => student.payments)
  @JoinColumn({ name: 'student_id' })
  student!: Student;

  @ManyToOne(() => Contract, (contract) => contract.payments)
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @ManyToOne(() => UtilityBill, (utilityBill) => utilityBill.payments)
  @JoinColumn({ name: 'utility_bill_id' })
  utilityBill!: UtilityBill;
}
