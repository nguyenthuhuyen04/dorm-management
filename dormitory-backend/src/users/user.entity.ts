import { Exclude } from 'class-transformer';
import { Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole, UserStatus } from '../common/enums/user-role.enum';
import { Building } from '../buildings/building.entity';
import { Student } from '../students/student.entity';

export { UserRole, UserStatus } from '../common/enums/user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'username', length: 50, unique: true })
  username!: string;

  @Column({ name: 'password', length: 255 })
  @Exclude()
  password!: string;

  @Column({ name: 'full_name', length: 100 })
  fullName!: string;

  
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: true,
  })
  email!: string | null;

  @Column({  type: 'varchar', name: 'phone', length: 15, nullable: true })
  phone!: string | null;

  @Column({  type: 'varchar', name: 'role', length: 20 })
  role!: UserRole;

  @Column({  type: 'varchar', name: 'status', length: 20, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @OneToOne(() => Student, (student) => student.user, { nullable: true })
  student!: Student | null;

  @OneToMany(() => Building, (building) => building.manager)
  managedBuildings!: Building[];
}
