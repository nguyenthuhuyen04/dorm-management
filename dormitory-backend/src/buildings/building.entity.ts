import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Room } from '../rooms/room.entity';

@Entity('buildings')
export class Building {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'building_name', type: 'varchar', length: 100, unique: true })
  buildingName!: string;

  @Column({ name: 'gender', type: 'varchar', length: 10 })
  gender!: 'Male' | 'Female';

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'manager_id' })
  manager!: User;

  @OneToMany(() => Room, (room) => room.building)
  rooms!: Room[];
}
