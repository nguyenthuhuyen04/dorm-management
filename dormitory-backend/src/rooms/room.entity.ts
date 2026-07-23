import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Building } from '../buildings/building.entity';
import { Contract } from '../contracts/contract.entity';
import { UtilityBill } from '../utility-bills/utility-bill.entity';
import { SupportRequest } from '../support-requests/support-request.entity';
import { RoomChangeRequest } from '../room-change-requests/room-change-request.entity';
import { Gender, RoomStatus } from '../common/enums/user-role.enum';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'building_id', type: 'int' })
  buildingId!: number;

  @Column({ name: 'room_number', type: 'varchar', length: 20 })
  roomNumber!: string;

  @Column({ name: 'floor', type: 'int' })
  floor!: number;

  @Column({ name: 'room_type', type: 'varchar', length: 20, nullable: true })
  roomType!: string | null;

  @Column({ name: 'gender', type: 'varchar', length: 10, nullable: true })
  gender!: Gender | null;

  @Column({ name: 'capacity', type: 'int' })
  capacity!: number;

  @Column({ name: 'room_fee', type: 'decimal', precision: 10, scale: 2 })
  roomFee!: number;

  @Column({ name: 'status', type: 'varchar', length: 20, default: RoomStatus.ACTIVE })
  status!: RoomStatus;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @ManyToOne(() => Building, (building) => building.rooms)
  @JoinColumn({ name: 'building_id' })
  building!: Building;

  @OneToMany(() => Contract, (contract) => contract.room)
  contracts!: Contract[];

  @OneToMany(() => UtilityBill, (utilityBill) => utilityBill.room)
  utilityBills!: UtilityBill[];

  @OneToMany(() => SupportRequest, (supportRequest) => supportRequest.room)
  supportRequests!: SupportRequest[];

  @OneToMany(() => RoomChangeRequest, (roomChangeRequest) => roomChangeRequest.currentRoom)
  currentRoomChangeRequests!: RoomChangeRequest[];

  @OneToMany(() => RoomChangeRequest, (roomChangeRequest) => roomChangeRequest.requestedRoom)
  requestedRoomChangeRequests!: RoomChangeRequest[];
}
