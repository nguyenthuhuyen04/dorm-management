import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  room_code!: string;

  @Column()
  room_name!: string;

  @Column()
  capacity!: number;

  @Column({ default: 0 })
  current_quantity!: number;

  @Column({ default: 'AVAILABLE' })
  status!: string;

  @Column('decimal', { precision: 12, scale: 2 })
  price!: number;
}
