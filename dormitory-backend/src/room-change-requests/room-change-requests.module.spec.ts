import { Global, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RoomChangeRequestsModule } from './room-change-requests.module';
import { RoomChangeRequestsService } from './room-change-requests.service';
import { RoomChangeRequestsController } from './room-change-requests.controller';
import { RoomChangeRequestsRepository } from './room-change-requests.repository';
import { RoomChangeRequest } from './room-change-request.entity';

describe('RoomChangeRequestsModule', () => {
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
      imports: [MockDbModule, RoomChangeRequestsModule],
    })
      .overrideProvider(getRepositoryToken(RoomChangeRequest))
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

  it('should resolve RoomChangeRequestsService', () => {
    const service = moduleRef.get<RoomChangeRequestsService>(
      RoomChangeRequestsService,
    );
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(RoomChangeRequestsService);
  });

  it('should resolve RoomChangeRequestsController', () => {
    const controller = moduleRef.get<RoomChangeRequestsController>(
      RoomChangeRequestsController,
    );
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(RoomChangeRequestsController);
  });

  it('should resolve RoomChangeRequestsRepository', () => {
    const repository = moduleRef.get<RoomChangeRequestsRepository>(
      RoomChangeRequestsRepository,
    );
    expect(repository).toBeDefined();
    expect(repository).toBeInstanceOf(RoomChangeRequestsRepository);
  });
});
