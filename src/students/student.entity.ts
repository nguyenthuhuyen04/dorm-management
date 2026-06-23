import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'student_code', type: 'varchar', length: 20, unique: true })
  student_code!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 100 })
  full_name!: string;

  @Column({ name: 'gender', type: 'varchar', length: 10, nullable: true })
  gender?: string;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ name: 'email', type: 'varchar', length: 100, nullable: true })
  email?: string;

  @Column({ name: 'class_name', type: 'varchar', length: 50, nullable: true })
  class_name?: string;

  @Column({ name: 'address', type: 'varchar', length: 255, nullable: true })
  address?: string;
}
