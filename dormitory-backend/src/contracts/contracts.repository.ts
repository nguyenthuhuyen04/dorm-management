import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Contract } from './contract.entity';

@Injectable()
export class ContractsRepository extends Repository<Contract> {
  constructor(dataSource: DataSource) {
    super(Contract, dataSource.createEntityManager());
  }

  async findById(id: number): Promise<Contract | null> {
    return this.findOne({
      where: { id },
      relations: [
        'student',
        'student.user',
        'room',
        'room.building',
        'creator',
      ],
    });
  }

  async findByContractCode(contractCode: string): Promise<Contract | null> {
    return this.findOne({ where: { contractCode } });
  }

  async countActiveContractsByStudent(studentId: number): Promise<number> {
    return this.count({
      where: { studentId, status: 'ACTIVE' as any },
    });
  }

  async countActiveContractsByRoom(roomId: number): Promise<number> {
    return this.count({
      where: { roomId, status: 'ACTIVE' as any },
    });
  }

  async findActiveContractsByRoom(roomId: number): Promise<Contract[]> {
    return this.find({
      where: { roomId, status: 'ACTIVE' as any },
    });
  }

  async getActiveOccupancy(roomId: number): Promise<number> {
    const result = await this.manager.query(
      'SELECT COUNT(*) AS count FROM contracts WHERE room_id = ? AND status = ?',
      [roomId, 'ACTIVE'],
    );
    return Number(result?.[0]?.count ?? 0);
  }

  async hasActiveContractForStudent(studentId: number): Promise<boolean> {
    const count = await this.count({
      where: { studentId, status: 'ACTIVE' as any },
    });
    return count > 0;
  }

  async hasPaymentsForContract(contractId: number): Promise<boolean> {
    const result = await this.manager.query(
      'SELECT COUNT(*) AS count FROM payments WHERE contract_id = ?',
      [contractId],
    );
    return Number(result?.[0]?.count ?? 0) > 0;
  }

  async managerHasContractAccess(
    contractId: number,
    managerId: number,
  ): Promise<boolean> {
    const result = await this.manager.query(
      `SELECT EXISTS(
        SELECT 1
        FROM contracts c
        INNER JOIN rooms r ON r.id = c.room_id
        INNER JOIN buildings b ON b.id = r.building_id
        WHERE c.id = ? AND b.manager_id = ?
      ) AS has_access`,
      [contractId, managerId],
    );
    return Boolean(Number(result?.[0]?.has_access ?? 0));
  }
}
