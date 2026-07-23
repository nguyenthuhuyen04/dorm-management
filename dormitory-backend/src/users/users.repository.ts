import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User, UserStatus } from './user.entity';

@Injectable()
export class UsersRepository extends Repository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.findOne({ where: { username } });
  }

  async findByUsernameOrEmail(identifier: string): Promise<User | null> {
    return this.findOne({
      where: [{ username: identifier }, { email: identifier }],
    });
  }

  async findActiveUserById(id: number): Promise<User | null> {
    return this.findOne({ where: { id, status: UserStatus.ACTIVE } });
  }

  async findUserById(id: number): Promise<User | null> {
    return this.findOne({ where: { id } });
  }
}
