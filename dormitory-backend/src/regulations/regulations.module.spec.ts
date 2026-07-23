import { Global, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RegulationsModule } from './regulations.module';
import { RegulationsService } from './regulations.service';
import { RegulationsController } from './regulations.controller';
import { RegulationsRepository } from './regulations.repository';
import { Regulation } from './regulation.entity';

describe('RegulationsModule', () => {
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
      imports: [MockDbModule, RegulationsModule],
    })
      .overrideProvider(getRepositoryToken(Regulation))
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

  describe('Module structure and provider registration', () => {
    it('should compile the module successfully', () => {
      expect(moduleRef).toBeDefined();
    });

    it('should register and resolve RegulationsService', () => {
      const service = moduleRef.get<RegulationsService>(RegulationsService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(RegulationsService);
    });

    it('should register and resolve RegulationsController', () => {
      const controller = moduleRef.get<RegulationsController>(
        RegulationsController,
      );
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(RegulationsController);
    });

    it('should register and resolve RegulationsRepository', () => {
      const repository = moduleRef.get<RegulationsRepository>(
        RegulationsRepository,
      );
      expect(repository).toBeDefined();
      expect(repository).toBeInstanceOf(RegulationsRepository);
    });
  });

  describe('Module export behavior', () => {
    it('should export RegulationsService to consuming modules', async () => {
      @Module({
        imports: [MockDbModule, RegulationsModule],
      })
      class ConsumerModule {}

      const consumerRef = await Test.createTestingModule({
        imports: [ConsumerModule],
      })
        .overrideProvider(getRepositoryToken(Regulation))
        .useValue({})
        .compile();

      const exportedService =
        consumerRef.get<RegulationsService>(RegulationsService);
      expect(exportedService).toBeDefined();
      expect(exportedService).toBeInstanceOf(RegulationsService);
    });
  });

  describe('Dependency resolution errors (negative cases)', () => {
    it('should fail compilation if required DataSource dependency is missing', async () => {
      await expect(
        Test.createTestingModule({
          imports: [RegulationsModule],
        })
          .overrideProvider(getRepositoryToken(Regulation))
          .useValue({})
          .compile(),
      ).rejects.toThrow();
    });
  });
});
