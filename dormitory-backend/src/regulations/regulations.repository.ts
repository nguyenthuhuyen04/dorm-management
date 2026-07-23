import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Regulation } from './regulation.entity';

@Injectable()
export class RegulationsRepository extends Repository<Regulation> {
  constructor(dataSource: DataSource) {
    super(Regulation, dataSource.createEntityManager());
  }

  async findById(id: number): Promise<Regulation | null> {
    return this.findOne({
      where: { id },
      relations: ['creator'],
    });
  }
}
