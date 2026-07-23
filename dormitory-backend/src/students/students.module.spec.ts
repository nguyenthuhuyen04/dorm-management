import { Global, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StudentsModule } from './students.module';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { StudentsRepository } from './students.repository';
import { Student } from './student.entity';

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

describe('StudentsModule', () => {
  let moduleRef: TestingModule;

  const mockRepository = {};

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [MockDbModule, StudentsModule],
    })
      .overrideProvider(getRepositoryToken(Student))
      .useValue(mockRepository)
      .compile();
  });

  it('should compile module successfully', () => {
    expect(moduleRef).toBeDefined();
  });

  it('should resolve StudentsController', () => {
    const controller = moduleRef.get<StudentsController>(StudentsController);
    expect(controller).toBeDefined();
  });

  it('should resolve StudentsService', () => {
    const service = moduleRef.get<StudentsService>(StudentsService);
    expect(service).toBeDefined();
  });

  it('should resolve StudentsRepository', () => {
    const repository = moduleRef.get<StudentsRepository>(StudentsRepository);
    expect(repository).toBeDefined();
  });
});
