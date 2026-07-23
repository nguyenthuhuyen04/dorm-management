import { Global, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaymentsModule } from './payments.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { Payment } from './payment.entity';

describe('PaymentsModule', () => {
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
      imports: [MockDbModule, PaymentsModule],
    })
      .overrideProvider(getRepositoryToken(Payment))
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

  it('should resolve PaymentsService', () => {
    const service = moduleRef.get<PaymentsService>(PaymentsService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(PaymentsService);
  });

  it('should resolve PaymentsController', () => {
    const controller = moduleRef.get<PaymentsController>(PaymentsController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(PaymentsController);
  });

  it('should resolve PaymentsRepository', () => {
    const repository = moduleRef.get<PaymentsRepository>(PaymentsRepository);
    expect(repository).toBeDefined();
    expect(repository).toBeInstanceOf(PaymentsRepository);
  });
});
