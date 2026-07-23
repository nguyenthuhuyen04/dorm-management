import { Global, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RoomsModule } from './rooms.module';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomsRepository } from './rooms.repository';
import { Room } from './room.entity';

const mockEntityManager = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  query: jest.fn(),
  getRepository: jest.fn().mockReturnThis(),
  createQueryBuilder: jest.fn().mockReturnValue({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  }),
};

const mockDataSource = {
  manager: mockEntityManager,
  transaction: jest.fn(),
  createEntityManager: jest.fn().mockReturnValue(mockEntityManager),
  getRepository: jest.fn().mockReturnValue(mockEntityManager),
  entityMetadatas: [],
  options: { type: 'mysql' },
};

@Global()
@Module({
  providers: [
    {
      provide: getDataSourceToken(),
      useValue: mockDataSource,
    },
    {
      provide: DataSource,
      useValue: mockDataSource,
    },
  ],
  exports: [getDataSourceToken(), DataSource],
})
class MockDbModule {}

describe('RoomsModule', () => {
  let moduleRef: TestingModule;

  const mockRepository = {};

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [MockDbModule, RoomsModule],
    })
      .overrideProvider(getRepositoryToken(Room))
      .useValue(mockRepository)
      .compile();
  });

  it('should compile module successfully', () => {
    expect(moduleRef).toBeDefined();
  });

  it('should resolve RoomsController', () => {
    const controller = moduleRef.get<RoomsController>(RoomsController);
    expect(controller).toBeDefined();
  });

  it('should resolve RoomsService', () => {
    const service = moduleRef.get<RoomsService>(RoomsService);
    expect(service).toBeDefined();
  });

  it('should resolve RoomsRepository', () => {
    const repository = moduleRef.get<RoomsRepository>(RoomsRepository);
    expect(repository).toBeDefined();
  });
});
