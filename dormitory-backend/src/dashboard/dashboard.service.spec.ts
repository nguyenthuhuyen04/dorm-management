import { DataSource } from 'typeorm';
import { DashboardService } from './dashboard.service';
import { UserRole, UserStatus } from '../users/user.entity';
import {
  ContractStatus,
  PaymentStatus,
  RoomStatus,
  UtilityBillStatus,
  SupportStatus,
  RoomChangeStatus,
  TargetRole,
} from '../common/enums/user-role.enum';

describe('DashboardService', () => {
  let service: DashboardService;
  let dataSource: any;
  let usersRepository: any;
  let studentsRepository: any;
  let buildingsRepository: any;
  let roomsRepository: any;
  let contractsRepository: any;
  let paymentsRepository: any;
  let utilityBillsRepository: any;
  let supportRequestsRepository: any;
  let roomChangeRequestsRepository: any;
  let announcementsRepository: any;
  let regulationsRepository: any;

  beforeEach(() => {
    dataSource = {
      manager: {
        query: jest.fn(),
      },
    };

    usersRepository = {
      count: jest.fn(),
    };
    studentsRepository = {
      count: jest.fn(),
    };
    buildingsRepository = {
      count: jest.fn(),
    };
    roomsRepository = {
      count: jest.fn(),
    };
    contractsRepository = {
      count: jest.fn(),
    };
    paymentsRepository = {
      count: jest.fn(),
    };
    utilityBillsRepository = {
      count: jest.fn(),
    };
    supportRequestsRepository = {
      count: jest.fn(),
    };
    roomChangeRequestsRepository = {
      count: jest.fn(),
    };
    announcementsRepository = {
      count: jest.fn(),
    };
    regulationsRepository = {
      count: jest.fn(),
    };

    service = new DashboardService(
      usersRepository,
      studentsRepository,
      buildingsRepository,
      roomsRepository,
      contractsRepository,
      paymentsRepository,
      utilityBillsRepository,
      supportRequestsRepository,
      roomChangeRequestsRepository,
      announcementsRepository,
      regulationsRepository,
      dataSource as DataSource,
    );
  });

  it('should return all zero values for empty database', async () => {
    usersRepository.count.mockResolvedValue(0);
    buildingsRepository.count.mockResolvedValue(0);
    roomsRepository.count.mockResolvedValue(0);
    contractsRepository.count.mockResolvedValue(0);
    paymentsRepository.count.mockResolvedValue(0);
    utilityBillsRepository.count.mockResolvedValue(0);
    supportRequestsRepository.count.mockResolvedValue(0);
    roomChangeRequestsRepository.count.mockResolvedValue(0);
    announcementsRepository.count.mockResolvedValue(0);
    regulationsRepository.count.mockResolvedValue(0);
    dataSource.manager.query.mockResolvedValue([{ count: 0 }]);

    const result = await service.getDashboard({
      userId: 1,
      role: UserRole.ADMIN,
    });

    expect(result.users.total).toBe(0);
    expect(result.users.admins).toBe(0);
    expect(result.rooms.total).toBe(0);
    expect(result.rooms.occupancyRate).toBe(0);
    expect(result.contracts.expired).toBe(0);
    expect(result.payments.overdue).toBe(0);
    expect(result.supportRequests.resolved).toBe(0);
    expect(result.announcements.total).toBe(0);
  });

  it('should return admin dashboard aggregates', async () => {
    usersRepository.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(0);
    buildingsRepository.count.mockResolvedValue(2);
    roomsRepository.count.mockResolvedValueOnce(4).mockResolvedValueOnce(0);
    contractsRepository.count.mockResolvedValue(3);
    paymentsRepository.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    utilityBillsRepository.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(3);
    supportRequestsRepository.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    roomChangeRequestsRepository.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    announcementsRepository.count.mockResolvedValue(2);
    regulationsRepository.count.mockResolvedValue(2);

    dataSource.manager.query
      .mockResolvedValueOnce([{ count: 3 }])
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 3 }])
      .mockResolvedValueOnce([{ count: 3 }])
      .mockResolvedValueOnce([{ count: 3 }])
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 1 }]);

    const result = await service.getDashboard({
      userId: 1,
      role: UserRole.ADMIN,
    });

    expect(result.users.total).toBe(5);
    expect(result.users.admins).toBe(1);
    expect(result.users.managers).toBe(1);
    expect(result.users.students).toBe(3);
    expect(result.buildings.total).toBe(2);
    expect(result.rooms.total).toBe(4);
    expect(result.rooms.occupied).toBe(3);
    expect(result.rooms.available).toBe(1);
    expect(result.rooms.occupancyRate).toBe(75);
    expect(result.payments.total).toBe(3);
    expect(result.payments.paid).toBe(1);
    expect(result.payments.pending).toBe(1);
    expect(result.utilityBills.total).toBe(3);
    expect(result.supportRequests.processing).toBe(1);
    expect(result.roomChangeRequests.approved).toBe(1);
    expect(result.announcements.total).toBe(2);
    expect(result.regulations.total).toBe(2);
  });

  it('should return manager dashboard aggregates', async () => {
    dataSource.manager.query
      .mockResolvedValueOnce([{ count: 1 }]) // buildingsTotal
      .mockResolvedValueOnce([{ count: 2 }]) // roomsTotal
      .mockResolvedValueOnce([{ count: 0 }]) // roomsMaintenance
      .mockResolvedValueOnce([{ count: 1 }]) // roomsOccupied
      .mockResolvedValueOnce([{ count: 1 }]) // roomsAvailable
      .mockResolvedValueOnce([{ count: 1 }]) // usersTotal
      .mockResolvedValueOnce([{ count: 1 }]) // usersActive
      .mockResolvedValueOnce([{ count: 1 }]) // studentsTotal
      .mockResolvedValueOnce([{ count: 1 }]) // studentsActive
      .mockResolvedValueOnce([{ count: 1 }]) // contractsTotal
      .mockResolvedValueOnce([{ count: 1 }]) // contractsActive
      .mockResolvedValueOnce([{ count: 0 }]) // contractsExpired
      .mockResolvedValueOnce([{ count: 1 }]) // paymentsTotal
      .mockResolvedValueOnce([{ count: 1 }]) // paymentsPaid
      .mockResolvedValueOnce([{ count: 0 }]) // paymentsPending
      .mockResolvedValueOnce([{ count: 0 }]) // paymentsOverdue
      .mockResolvedValueOnce([{ count: 1 }]) // utilityBillsTotal
      .mockResolvedValueOnce([{ count: 1 }]) // utilityBillsPublished
      .mockResolvedValueOnce([{ count: 0 }]) // utilityBillsDraft
      .mockResolvedValueOnce([{ count: 1 }]) // supportRequestsTotal
      .mockResolvedValueOnce([{ count: 1 }]) // supportRequestsPending
      .mockResolvedValueOnce([{ count: 0 }]) // supportRequestsProcessing
      .mockResolvedValueOnce([{ count: 0 }]) // supportRequestsResolved
      .mockResolvedValueOnce([{ count: 1 }]) // roomChangeRequestsTotal
      .mockResolvedValueOnce([{ count: 1 }]) // requestPendingManager
      .mockResolvedValueOnce([{ count: 0 }]) // requestApprovedManager
      .mockResolvedValueOnce([{ count: 0 }]) // requestRejectedManager
      .mockResolvedValueOnce([{ count: 2 }]); // announcementsTotal

    regulationsRepository.count.mockResolvedValue(2);

    const result = await service.getDashboard({
      userId: 2,
      role: UserRole.MANAGER,
    });

    expect(result.users.total).toBe(1);
    expect(result.users.students).toBe(1);
    expect(result.users.admins).toBe(0);
    expect(result.buildings.total).toBe(1);
    expect(result.rooms.total).toBe(2);
    expect(result.rooms.available).toBe(1);
    expect(result.rooms.occupied).toBe(1);
    expect(result.contracts.total).toBe(1);
    expect(result.payments.total).toBe(1);
    expect(result.utilityBills.total).toBe(1);
    expect(result.supportRequests.total).toBe(1);
    expect(result.roomChangeRequests.pending).toBe(1);
    expect(result.announcements.total).toBe(2);
    expect(result.regulations.total).toBe(2);
  });
});
