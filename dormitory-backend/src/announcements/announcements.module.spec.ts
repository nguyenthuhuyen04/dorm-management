import { Global, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AnnouncementsModule } from './announcements.module';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsRepository } from './announcements.repository';
import { Announcement } from './announcement.entity';

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

describe('AnnouncementsModule', () => {
  let moduleRef: TestingModule;

  const mockRepository = {};

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [MockDbModule, AnnouncementsModule],
    })
      .overrideProvider(getRepositoryToken(Announcement))
      .useValue(mockRepository)
      .compile();
  });

  it('should compile module successfully', () => {
    expect(moduleRef).toBeDefined();
  });

  it('should resolve AnnouncementsController', () => {
    const controller = moduleRef.get<AnnouncementsController>(
      AnnouncementsController,
    );
    expect(controller).toBeDefined();
  });

  it('should resolve AnnouncementsService', () => {
    const service = moduleRef.get<AnnouncementsService>(AnnouncementsService);
    expect(service).toBeDefined();
  });

  it('should resolve AnnouncementsRepository', () => {
    const repository = moduleRef.get<AnnouncementsRepository>(
      AnnouncementsRepository,
    );
    expect(repository).toBeDefined();
  });
});
