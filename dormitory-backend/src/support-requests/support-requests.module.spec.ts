import { Global, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SupportRequestsModule } from './support-requests.module';
import { SupportRequestsController } from './support-requests.controller';
import { SupportRequestsService } from './support-requests.service';
import { SupportRequestsRepository } from './support-requests.repository';
import { SupportRequest } from './support-request.entity';

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

describe('SupportRequestsModule', () => {
  let moduleRef: TestingModule;

  const mockRepository = {};

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [MockDbModule, SupportRequestsModule],
    })
      .overrideProvider(getRepositoryToken(SupportRequest))
      .useValue(mockRepository)
      .compile();
  });

  it('should compile module successfully', () => {
    expect(moduleRef).toBeDefined();
  });

  it('should resolve SupportRequestsController', () => {
    const controller = moduleRef.get<SupportRequestsController>(
      SupportRequestsController,
    );
    expect(controller).toBeDefined();
  });

  it('should resolve SupportRequestsService', () => {
    const service = moduleRef.get<SupportRequestsService>(
      SupportRequestsService,
    );
    expect(service).toBeDefined();
  });

  it('should resolve SupportRequestsRepository', () => {
    const repository = moduleRef.get<SupportRequestsRepository>(
      SupportRequestsRepository,
    );
    expect(repository).toBeDefined();
  });
});
