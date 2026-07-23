import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Building } from './building.entity';
import { Room } from '../rooms/room.entity';

@Injectable()
export class BuildingsRepository extends Repository<Building> {
  constructor(dataSource: DataSource) {
    super(Building, dataSource.createEntityManager());
  }

  async findById(id: number): Promise<Building | null> {
    return this.findOne({
      where: { id },
      relations: ['manager'],
    });
  }

  async countRooms(buildingId: number): Promise<number> {
    return this.manager.count(Room, { where: { buildingId } });
  }
}
