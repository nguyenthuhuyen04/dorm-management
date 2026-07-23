import { Global, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ContractsModule } from './contracts.module';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { ContractsRepository } from './contracts.repository';
import { Contract } from './contract.entity';

describe('ContractsModule', () => {
  let moduleRef: TestingModule;

  const mockDataSource = {
    manager: {
      findOne: jest.fn(),
    },
    transaction: jest.fn(),
    createEntityManager: jest.fn().mockReturnValue({}),
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

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [MockDbModule, ContractsModule],
    })
      .overrideProvider(getRepositoryToken(Contract))
      .useValue({
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
        createQueryBuilder: jest.fn(),
      })
      .compile();
  });

  it('should compile the module successfully', () => {
    expect(moduleRef).toBeDefined();
  });

  it('should resolve ContractsService', () => {
    const service = moduleRef.get<ContractsService>(ContractsService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ContractsService);
  });

  it('should resolve ContractsController', () => {
    const controller = moduleRef.get<ContractsController>(ContractsController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(ContractsController);
  });

  it('should resolve ContractsRepository', () => {
    const repository = moduleRef.get<ContractsRepository>(ContractsRepository);
    expect(repository).toBeDefined();
    expect(repository).toBeInstanceOf(ContractsRepository);
  });
});
