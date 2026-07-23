import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { TargetRole } from '../common/enums/user-role.enum';

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', name: 'title', length: 255 })
  title!: string;

  @Column({ name: 'content', type: 'text' })
  content!: string;

  @Column({ type: 'varchar', name: 'target_role', length: 20 })
  targetRole!: TargetRole;

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
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator!: User;
}
