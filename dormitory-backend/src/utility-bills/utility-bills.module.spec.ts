import { Global, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UtilityBillsModule } from './utility-bills.module';
import { UtilityBillsService } from './utility-bills.service';
import { UtilityBillsController } from './utility-bills.controller';
import { UtilityBillsRepository } from './utility-bills.repository';
import { UtilityBill } from './utility-bill.entity';

describe('UtilityBillsModule', () => {
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
      imports: [MockDbModule, UtilityBillsModule],
    })
      .overrideProvider(getRepositoryToken(UtilityBill))
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

  it('should resolve UtilityBillsService', () => {
    const service = moduleRef.get<UtilityBillsService>(UtilityBillsService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(UtilityBillsService);
  });

  it('should resolve UtilityBillsController', () => {
    const controller = moduleRef.get<UtilityBillsController>(
      UtilityBillsController,
    );
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(UtilityBillsController);
  });

  it('should resolve UtilityBillsRepository', () => {
    const repository = moduleRef.get<UtilityBillsRepository>(
      UtilityBillsRepository,
    );
    expect(repository).toBeDefined();
    expect(repository).toBeInstanceOf(UtilityBillsRepository);
  });
});
