export class CreateRoomDto {
  room_code!: string;
  room_name!: string;
  capacity!: number;
  current_quantity!: number;
  status!: string;
  price!: number;
}
