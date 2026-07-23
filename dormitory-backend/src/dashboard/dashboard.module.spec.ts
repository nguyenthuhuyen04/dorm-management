import { Global, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DashboardModule } from './dashboard.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User } from '../users/user.entity';
import { Student } from '../students/student.entity';
import { Building } from '../buildings/building.entity';
import { Room } from '../rooms/room.entity';
import { Contract } from '../contracts/contract.entity';
import { Payment } from '../payments/payment.entity';
import { UtilityBill } from '../utility-bills/utility-bill.entity';
import { SupportRequest } from '../support-requests/support-request.entity';
import { RoomChangeRequest } from '../room-change-requests/room-change-request.entity';
import { Announcement } from '../announcements/announcement.entity';
import { Regulation } from '../regulations/regulation.entity';
import { UsersRepository } from '../users/users.repository';
import { StudentsRepository } from '../students/students.repository';
import { BuildingsRepository } from '../buildings/buildings.repository';
import { RoomsRepository } from '../rooms/rooms.repository';
import { ContractsRepository } from '../contracts/contracts.repository';
import { PaymentsRepository } from '../payments/payments.repository';
import { UtilityBillsRepository } from '../utility-bills/utility-bills.repository';
import { SupportRequestsRepository } from '../support-requests/support-requests.repository';
import { RoomChangeRequestsRepository } from '../room-change-requests/room-change-requests.repository';
import { AnnouncementsRepository } from '../announcements/announcements.repository';
import { RegulationsRepository } from '../regulations/regulations.repository';

describe('DashboardModule', () => {
  let moduleRef: TestingModule;

  const mockRepository = {};
  const mockEntityManager = {
    query: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
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

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [MockDbModule, DashboardModule],
    })
      .overrideProvider(getRepositoryToken(User))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(Student))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(Building))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(Room))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(Contract))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(Payment))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(UtilityBill))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(SupportRequest))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(RoomChangeRequest))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(Announcement))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(Regulation))
      .useValue(mockRepository)
      .overrideProvider(getDataSourceToken())
      .useValue(mockDataSource)
      .overrideProvider(DataSource)
      .useValue(mockDataSource)
      .compile();
  });

  it('should compile module successfully', () => {
    expect(moduleRef).toBeDefined();
  });

  it('should be defined', () => {
    expect(moduleRef).toBeDefined();
  });

  it('should resolve DashboardController', () => {
    const controller = moduleRef.get<DashboardController>(DashboardController);
    expect(controller).toBeDefined();
  });

  it('should resolve DashboardService', () => {
    const service = moduleRef.get<DashboardService>(DashboardService);
    expect(service).toBeDefined();
  });
});
