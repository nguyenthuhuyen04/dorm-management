import { Global, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BuildingsModule } from './buildings.module';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { BuildingsRepository } from './buildings.repository';
import { Building } from './building.entity';

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

describe('BuildingsModule', () => {
  let moduleRef: TestingModule;

  const mockRepository = {};

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [MockDbModule, BuildingsModule],
    })
      .overrideProvider(getRepositoryToken(Building))
      .useValue(mockRepository)
      .compile();
  });

  it('should compile module successfully', () => {
    expect(moduleRef).toBeDefined();
  });

  it('should resolve BuildingsController', () => {
    const controller = moduleRef.get<BuildingsController>(BuildingsController);
    expect(controller).toBeDefined();
  });

  it('should resolve BuildingsService', () => {
    const service = moduleRef.get<BuildingsService>(BuildingsService);
    expect(service).toBeDefined();
  });

  it('should resolve BuildingsRepository', () => {
    const repository = moduleRef.get<BuildingsRepository>(BuildingsRepository);
    expect(repository).toBeDefined();
  });
});
