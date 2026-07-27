import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User, UserRole, UserStatus } from '../users/user.entity';
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
import {
  ContractStatus,
  PaymentStatus,
  RoomStatus,
  UtilityBillStatus,
  SupportStatus,
  RoomChangeStatus,
  TargetRole,
} from '../common/enums/user-role.enum';

interface AuthenticatedUser {
  userId: number;
  role: UserRole;
}

interface DashboardUsersStats {
  total: number;
  admins: number;
  managers: number;
  students: number;
  active: number;
  inactive: number;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly studentsRepository: StudentsRepository,
    private readonly buildingsRepository: BuildingsRepository,
    private readonly roomsRepository: RoomsRepository,
    private readonly contractsRepository: ContractsRepository,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly utilityBillsRepository: UtilityBillsRepository,
    private readonly supportRequestsRepository: SupportRequestsRepository,
    private readonly roomChangeRequestsRepository: RoomChangeRequestsRepository,
    private readonly announcementsRepository: AnnouncementsRepository,
    private readonly regulationsRepository: RegulationsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async getDashboard(currentUser: AuthenticatedUser) {
    if (currentUser.role === UserRole.MANAGER) {
      return this.getManagerDashboard(currentUser.userId);
    }
    return this.getAdminDashboard();
  }

  async getStudentDashboard(userId: number) {
    // Find student record
    const studentQuery = await this.dataSource.manager.query(
      `SELECT id FROM students WHERE user_id = ?`,
      [userId],
    );
    if (!studentQuery || studentQuery.length === 0) {
      return {
        contract: null,
        payments: {
          totalAmount: 0,
          paidAmount: 0,
          unpaidAmount: 0,
          paidCount: 0,
          unpaidCount: 0,
          overdueCount: 0,
        },
        supportRequests: {
          total: 0,
          pending: 0,
          resolved: 0,
        },
      };
    }
    const studentId = Number(studentQuery[0].id);

    // Get active contract with room and building info
    const contractData = await this.dataSource.manager.query(
      `SELECT
        c.id,
        c.contract_code AS contractCode,
        c.start_date AS startDate,
        c.end_date AS endDate,
        c.deposit,
        c.status,
        r.room_number AS roomNumber,
        r.floor,
        b.building_name AS buildingName
      FROM contracts c
      INNER JOIN rooms r ON r.id = c.room_id
      INNER JOIN buildings b ON b.id = r.building_id
      WHERE c.student_id = ?
        AND c.status = ?
      ORDER BY c.created_at DESC
      LIMIT 1`,
      [studentId, ContractStatus.ACTIVE],
    );

    let contract: any = null;
    if (contractData && contractData.length > 0) {
      const c = contractData[0];
      contract = {
        id: c.id,
        contractCode: c.contractCode,
        startDate: c.startDate,
        endDate: c.endDate,
        deposit: Number(c.deposit),
        status: c.status,
        room: {
          roomNumber: c.roomNumber,
          buildingName: c.buildingName,
          floor: c.floor,
        },
      };
    }

    // Aggregate payments
    const paymentAgg = await this.dataSource.manager.query(
      `SELECT
        COALESCE(SUM(total_amount), 0) AS totalAmount,
        COALESCE(SUM(CASE WHEN status = ? THEN total_amount ELSE 0 END), 0) AS paidAmount,
        COALESCE(SUM(CASE WHEN status IN (?, ?) THEN total_amount ELSE 0 END), 0) AS unpaidAmount,
        COUNT(*) AS totalCount,
        COUNT(CASE WHEN status = ? THEN 1 END) AS paidCount,
        COUNT(CASE WHEN status IN (?, ?) THEN 1 END) AS unpaidCount,
        COUNT(CASE WHEN status != ? AND due_date < CURRENT_DATE THEN 1 END) AS overdueCount
      FROM payments
      WHERE student_id = ?`,
      [
        PaymentStatus.PAID,
        PaymentStatus.UNPAID,
        PaymentStatus.PENDING,
        PaymentStatus.PAID,
        PaymentStatus.UNPAID,
        PaymentStatus.PENDING,
        PaymentStatus.PAID,
        studentId,
      ],
    );

    const p = paymentAgg[0];

    // Count support requests
    const supportAgg = await this.dataSource.manager.query(
      `SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN status = ? THEN 1 END) AS pending,
        COUNT(CASE WHEN status = ? THEN 1 END) AS resolved
      FROM support_requests
      WHERE student_id = ?`,
      [SupportStatus.PENDING, SupportStatus.DONE, studentId],
    );

    const s = supportAgg[0];

    return {
      contract,
      payments: {
        totalAmount: Number(p.totalAmount),
        paidAmount: Number(p.paidAmount),
        unpaidAmount: Number(p.unpaidAmount),
        paidCount: Number(p.paidCount),
        unpaidCount: Number(p.unpaidCount),
        overdueCount: Number(p.overdueCount),
      },
      supportRequests: {
        total: Number(s.total),
        pending: Number(s.pending),
        resolved: Number(s.resolved),
      },
    };
  }

  private async getAdminDashboard() {
    const [usersTotal, admins, managers, students, activeUsers, inactiveUsers] =
      await Promise.all([
        this.usersRepository.count(),
        this.usersRepository.count({ where: { role: UserRole.ADMIN } }),
        this.usersRepository.count({ where: { role: UserRole.MANAGER } }),
        this.usersRepository.count({ where: { role: UserRole.STUDENT } }),
        this.usersRepository.count({ where: { status: UserStatus.ACTIVE } }),
        this.usersRepository.count({ where: { status: UserStatus.INACTIVE } }),
      ]);

    const [
      buildingsTotal,
      roomsTotal,
      roomsMaintenance,
      roomsOccupied,
      roomsAvailable,
    ] = await Promise.all([
      this.buildingsRepository.count(),
      this.roomsRepository.count(),
      this.roomsRepository.count({ where: { status: RoomStatus.MAINTENANCE } }),
      this.countQuery(
        `SELECT COUNT(DISTINCT r.id) AS count
           FROM rooms r
           INNER JOIN contracts c ON c.room_id = r.id
           WHERE c.status = ?`,
        [ContractStatus.ACTIVE],
      ),
      this.countQuery(
        `SELECT COUNT(*) AS count
           FROM rooms r
           WHERE r.status = ?
             AND NOT EXISTS (
               SELECT 1 FROM contracts c
               WHERE c.room_id = r.id
                 AND c.status = ?
             )`,
        [RoomStatus.ACTIVE, ContractStatus.ACTIVE],
      ),
    ]);

    const [studentsTotal, studentsActive] = await Promise.all([
      this.countQuery(`SELECT COUNT(*) AS count FROM students`, []),
      this.countQuery(
        `SELECT COUNT(*) AS count
         FROM students s
         INNER JOIN users u ON u.id = s.user_id
         WHERE u.status = ?`,
        [UserStatus.ACTIVE],
      ),
    ]);

    const [contractsTotal, contractsActive, contractsExpired] =
      await Promise.all([
        this.contractsRepository.count(),
        this.countQuery(
          `SELECT COUNT(*) AS count
         FROM contracts c
         WHERE c.status = ?
           AND c.end_date >= CURRENT_DATE`,
          [ContractStatus.ACTIVE],
        ),
        this.countQuery(
          `SELECT COUNT(*) AS count
         FROM contracts c
         WHERE c.end_date < CURRENT_DATE`,
          [],
        ),
      ]);

    const [
      paymentsTotal,
      paymentsPaid,
      paymentsPending,
      paymentsOverdue,
      revenue,
    ] = await Promise.all([
      this.paymentsRepository.count(),
      this.paymentsRepository.count({
        where: { status: PaymentStatus.PAID },
      }),
      this.paymentsRepository.count({
        where: { status: PaymentStatus.PENDING },
      }),
      this.countQuery(
        `SELECT COUNT(*) AS count
           FROM payments p
           WHERE p.status != ?
             AND p.due_date < CURRENT_DATE`,
        [PaymentStatus.PAID],
      ),
      this.countQuery(
        `SELECT COALESCE(SUM(total_amount), 0) AS count
         FROM payments
         WHERE status = ?`,
        [PaymentStatus.PAID],
      ),
    ]);

    const [utilityBillsTotal, utilityBillsPublished, utilityBillsDraft] =
      await Promise.all([
        this.utilityBillsRepository.count(),
        this.utilityBillsRepository.count({
          where: { status: UtilityBillStatus.PUBLISHED },
        }),
        this.utilityBillsRepository.count({
          where: { status: UtilityBillStatus.DRAFT },
        }),
      ]);

    const [
      supportRequestsTotal,
      supportRequestsPending,
      supportRequestsProcessing,
      supportRequestsResolved,
    ] = await Promise.all([
      this.supportRequestsRepository.count(),
      this.supportRequestsRepository.count({
        where: { status: SupportStatus.PENDING },
      }),
      this.supportRequestsRepository.count({
        where: { status: SupportStatus.PROCESSING },
      }),
      this.supportRequestsRepository.count({
        where: { status: SupportStatus.DONE },
      }),
    ]);

    const [
      roomChangeRequestsTotal,
      requestPending,
      requestApproved,
      requestRejected,
    ] = await Promise.all([
      this.roomChangeRequestsRepository.count(),
      this.roomChangeRequestsRepository.count({
        where: { status: RoomChangeStatus.PENDING },
      }),
      this.roomChangeRequestsRepository.count({
        where: { status: RoomChangeStatus.APPROVED },
      }),
      this.roomChangeRequestsRepository.count({
        where: { status: RoomChangeStatus.REJECTED },
      }),
    ]);

    const [announcementsTotal, regulationsTotal] = await Promise.all([
      this.announcementsRepository.count(),
      this.regulationsRepository.count(),
    ]);

    return {
      users: {
        total: usersTotal,
        admins,
        managers,
        students,
        active: activeUsers,
        inactive: inactiveUsers,
      },
      buildings: {
        total: buildingsTotal,
      },
      rooms: {
        total: roomsTotal,
        available: roomsAvailable,
        occupied: roomsOccupied,
        maintenance: roomsMaintenance,
        occupancyRate:
          roomsTotal === 0
            ? 0
            : Number(((roomsOccupied / roomsTotal) * 100).toFixed(2)),
      },
      students: {
        total: studentsTotal,
        active: studentsActive,
      },
      contracts: {
        total: contractsTotal,
        active: contractsActive,
        expired: contractsExpired,
      },
      payments: {
        total: paymentsTotal,
        paid: paymentsPaid,
        pending: paymentsPending,
        overdue: paymentsOverdue,
      },
      revenue: {
        total: Number(revenue),
      },
      utilityBills: {
        total: utilityBillsTotal,
        published: utilityBillsPublished,
        draft: utilityBillsDraft,
      },
      supportRequests: {
        total: supportRequestsTotal,
        pending: supportRequestsPending,
        processing: supportRequestsProcessing,
        resolved: supportRequestsResolved,
      },
      roomChangeRequests: {
        total: roomChangeRequestsTotal,
        pending: requestPending,
        approved: requestApproved,
        rejected: requestRejected,
      },
      announcements: {
        total: announcementsTotal,
      },
      regulations: {
        total: regulationsTotal,
      },
    };
  }

  private async getManagerDashboard(managerId: number) {
    const managerSubquery = `SELECT id FROM buildings WHERE manager_id = ?`;

    const [
      buildingsTotal,
      roomsTotal,
      roomsMaintenance,
      roomsOccupied,
      roomsAvailable,
    ] = await Promise.all([
      this.countQuery(
        `SELECT COUNT(*) AS count FROM buildings WHERE manager_id = ?`,
        [managerId],
      ),
      this.countQuery(
        `SELECT COUNT(*) AS count FROM rooms r WHERE r.building_id IN (${managerSubquery})`,
        [managerId],
      ),
      this.countQuery(
        `SELECT COUNT(*) AS count
           FROM rooms r
           WHERE r.building_id IN (${managerSubquery})
             AND r.status = ?`,
        [managerId, RoomStatus.MAINTENANCE],
      ),
      this.countQuery(
        `SELECT COUNT(DISTINCT r.id) AS count
           FROM rooms r
           INNER JOIN contracts c ON c.room_id = r.id
           WHERE r.building_id IN (${managerSubquery})
             AND c.status = ?`,
        [managerId, ContractStatus.ACTIVE],
      ),
      this.countQuery(
        `SELECT COUNT(*) AS count
           FROM rooms r
           WHERE r.building_id IN (${managerSubquery})
             AND r.status = ?
             AND NOT EXISTS (
               SELECT 1 FROM contracts c
               WHERE c.room_id = r.id
                 AND c.status = ?
             )`,
        [managerId, RoomStatus.ACTIVE, ContractStatus.ACTIVE],
      ),
    ]);

    const [usersTotal, usersActive] = await Promise.all([
      this.countQuery(
        `SELECT COUNT(DISTINCT u.id) AS count
         FROM users u
         INNER JOIN students s ON s.user_id = u.id
         INNER JOIN contracts c ON c.student_id = s.id
         INNER JOIN rooms r ON r.id = c.room_id
         INNER JOIN buildings b ON b.id = r.building_id
         WHERE b.manager_id = ?`,
        [managerId],
      ),
      this.countQuery(
        `SELECT COUNT(DISTINCT u.id) AS count
         FROM users u
         INNER JOIN students s ON s.user_id = u.id
         INNER JOIN contracts c ON c.student_id = s.id
         INNER JOIN rooms r ON r.id = c.room_id
         INNER JOIN buildings b ON b.id = r.building_id
         WHERE b.manager_id = ?
           AND u.status = ?`,
        [managerId, UserStatus.ACTIVE],
      ),
    ]);

    const users = {
      total: usersTotal,
      admins: 0,
      managers: 0,
      students: usersTotal,
      active: usersActive,
      inactive: usersTotal - usersActive,
    };

    const [studentsTotal, studentsActive] = await Promise.all([
      this.countQuery(
        `SELECT COUNT(DISTINCT s.id) AS count
         FROM students s
         INNER JOIN contracts c ON c.student_id = s.id
         INNER JOIN rooms r ON r.id = c.room_id
         INNER JOIN buildings b ON b.id = r.building_id
         WHERE b.manager_id = ?`,
        [managerId],
      ),
      this.countQuery(
        `SELECT COUNT(DISTINCT s.id) AS count
         FROM students s
         INNER JOIN users u ON u.id = s.user_id
         INNER JOIN contracts c ON c.student_id = s.id
         INNER JOIN rooms r ON r.id = c.room_id
         INNER JOIN buildings b ON b.id = r.building_id
         WHERE b.manager_id = ?
           AND u.status = ?`,
        [managerId, UserStatus.ACTIVE],
      ),
    ]);

    const [contractsTotal, contractsActive, contractsExpired] =
      await Promise.all([
        this.countQuery(
          `SELECT COUNT(*) AS count
         FROM contracts c
         INNER JOIN rooms r ON r.id = c.room_id
         INNER JOIN buildings b ON b.id = r.building_id
         WHERE b.manager_id = ?`,
          [managerId],
        ),
        this.countQuery(
          `SELECT COUNT(*) AS count
         FROM contracts c
         INNER JOIN rooms r ON r.id = c.room_id
         INNER JOIN buildings b ON b.id = r.building_id
         WHERE b.manager_id = ?
           AND c.status = ?
           AND c.end_date >= CURRENT_DATE`,
          [managerId, ContractStatus.ACTIVE],
        ),
        this.countQuery(
          `SELECT COUNT(*) AS count
         FROM contracts c
         INNER JOIN rooms r ON r.id = c.room_id
         INNER JOIN buildings b ON b.id = r.building_id
         WHERE b.manager_id = ?
           AND c.end_date < CURRENT_DATE`,
          [managerId],
        ),
      ]);

    const [
      paymentsTotal,
      paymentsPaid,
      paymentsPending,
      paymentsOverdue,
      revenue,
    ] = await Promise.all([
      this.countQuery(
        `SELECT COUNT(*) AS count
           FROM payments p
           INNER JOIN contracts c ON c.id = p.contract_id
           INNER JOIN rooms r ON r.id = c.room_id
           INNER JOIN buildings b ON b.id = r.building_id
           WHERE b.manager_id = ?`,
        [managerId],
      ),
      this.countQuery(
        `SELECT COUNT(*) AS count
           FROM payments p
           INNER JOIN contracts c ON c.id = p.contract_id
           INNER JOIN rooms r ON r.id = c.room_id
           INNER JOIN buildings b ON b.id = r.building_id
           WHERE b.manager_id = ?
             AND p.status = ?`,
        [managerId, PaymentStatus.PAID],
      ),
      this.countQuery(
        `SELECT COUNT(*) AS count
           FROM payments p
           INNER JOIN contracts c ON c.id = p.contract_id
           INNER JOIN rooms r ON r.id = c.room_id
           INNER JOIN buildings b ON b.id = r.building_id
           WHERE b.manager_id = ?
             AND p.status = ?`,
        [managerId, PaymentStatus.PENDING],
      ),
      this.countQuery(
        `SELECT COUNT(*) AS count
           FROM payments p
           INNER JOIN contracts c ON c.id = p.contract_id
           INNER JOIN rooms r ON r.id = c.room_id
           INNER JOIN buildings b ON b.id = r.building_id
           WHERE b.manager_id = ?
             AND p.status != ?
             AND p.due_date < CURRENT_DATE`,
        [managerId, PaymentStatus.PAID],
      ),
      this.countQuery(
        `SELECT COALESCE(SUM(p.total_amount), 0) AS count
           FROM payments p
           INNER JOIN contracts c ON c.id = p.contract_id
           INNER JOIN rooms r ON r.id = c.room_id
           INNER JOIN buildings b ON b.id = r.building_id
           WHERE b.manager_id = ?
             AND p.status = ?`,
        [managerId, PaymentStatus.PAID],
      ),
    ]);

    const [utilityBillsTotal, utilityBillsPublished, utilityBillsDraft] =
      await Promise.all([
        this.countQuery(
          `SELECT COUNT(*) AS count
           FROM utility_bills ub
           INNER JOIN rooms r ON r.id = ub.room_id
           INNER JOIN buildings b ON b.id = r.building_id
           WHERE b.manager_id = ?`,
          [managerId],
        ),
        this.countQuery(
          `SELECT COUNT(*) AS count
           FROM utility_bills ub
           INNER JOIN rooms r ON r.id = ub.room_id
           INNER JOIN buildings b ON b.id = r.building_id
           WHERE b.manager_id = ?
             AND ub.status = ?`,
          [managerId, UtilityBillStatus.PUBLISHED],
        ),
        this.countQuery(
          `SELECT COUNT(*) AS count
           FROM utility_bills ub
           INNER JOIN rooms r ON r.id = ub.room_id
           INNER JOIN buildings b ON b.id = r.building_id
           WHERE b.manager_id = ?
             AND ub.status = ?`,
          [managerId, UtilityBillStatus.DRAFT],
        ),
      ]);

    const [
      supportRequestsTotal,
      supportRequestsPending,
      supportRequestsProcessing,
      supportRequestsResolved,
    ] = await Promise.all([
      this.countQuery(
        `SELECT COUNT(*) AS count
           FROM support_requests sr
           INNER JOIN rooms r ON r.id = sr.room_id
           INNER JOIN buildings b ON b.id = r.building_id
           WHERE b.manager_id = ?`,
        [managerId],
      ),
      this.countQuery(
        `SELECT COUNT(*) AS count
           FROM support_requests sr
           INNER JOIN rooms r ON r.id = sr.room_id
           INNER JOIN buildings b ON b.id = r.building_id
           WHERE b.manager_id = ?
             AND sr.status = ?`,
        [managerId, SupportStatus.PENDING],
      ),
      this.countQuery(
        `SELECT COUNT(*) AS count
           FROM support_requests sr
           INNER JOIN rooms r ON r.id = sr.room_id
           INNER JOIN buildings b ON b.id = r.building_id
           WHERE b.manager_id = ?
             AND sr.status = ?`,
        [managerId, SupportStatus.PROCESSING],
      ),
      this.countQuery(
        `SELECT COUNT(*) AS count
           FROM support_requests sr
           INNER JOIN rooms r ON r.id = sr.room_id
           INNER JOIN buildings b ON b.id = r.building_id
           WHERE b.manager_id = ?
             AND sr.status = ?`,
        [managerId, SupportStatus.DONE],
      ),
    ]);

    const [
      roomChangeRequestsTotal,
      requestPendingManager,
      requestApprovedManager,
      requestRejectedManager,
    ] = await Promise.all([
      this.countQuery(
        `SELECT COUNT(*) AS count
           FROM room_change_requests rcr
           INNER JOIN rooms current_room ON current_room.id = rcr.current_room_id
           INNER JOIN buildings current_building ON current_building.id = current_room.building_id
           INNER JOIN rooms requested_room ON requested_room.id = rcr.requested_room_id
           INNER JOIN buildings requested_building ON requested_building.id = requested_room.building_id
           WHERE current_building.manager_id = ?
              OR requested_building.manager_id = ?`,
        [managerId, managerId],
      ),
      this.countQuery(
        `SELECT COUNT(*) AS count
           FROM room_change_requests rcr
           INNER JOIN rooms current_room ON current_room.id = rcr.current_room_id
           INNER JOIN buildings current_building ON current_building.id = current_room.building_id
           INNER JOIN rooms requested_room ON requested_room.id = rcr.requested_room_id
           INNER JOIN buildings requested_building ON requested_building.id = requested_room.building_id
           WHERE (current_building.manager_id = ? OR requested_building.manager_id = ?)
             AND rcr.status = ?`,
        [managerId, managerId, RoomChangeStatus.PENDING],
      ),
      this.countQuery(
        `SELECT COUNT(*) AS count
           FROM room_change_requests rcr
           INNER JOIN rooms current_room ON current_room.id = rcr.current_room_id
           INNER JOIN buildings current_building ON current_building.id = current_room.building_id
           INNER JOIN rooms requested_room ON requested_room.id = rcr.requested_room_id
           INNER JOIN buildings requested_building ON requested_building.id = requested_room.building_id
           WHERE (current_building.manager_id = ? OR requested_building.manager_id = ?)
             AND rcr.status = ?`,
        [managerId, managerId, RoomChangeStatus.APPROVED],
      ),
      this.countQuery(
        `SELECT COUNT(*) AS count
           FROM room_change_requests rcr
           INNER JOIN rooms current_room ON current_room.id = rcr.current_room_id
           INNER JOIN buildings current_building ON current_building.id = current_room.building_id
           INNER JOIN rooms requested_room ON requested_room.id = rcr.requested_room_id
           INNER JOIN buildings requested_building ON requested_building.id = requested_room.building_id
           WHERE (current_building.manager_id = ? OR requested_building.manager_id = ?)
             AND rcr.status = ?`,
        [managerId, managerId, RoomChangeStatus.REJECTED],
      ),
    ]);

    const [announcementsTotal, regulationsTotal] = await Promise.all([
      this.countQuery(
        `SELECT COUNT(*) AS count
         FROM announcements a
         WHERE a.target_role IN (?, ?)`,
        [TargetRole.ALL, TargetRole.MANAGER],
      ),
      this.regulationsRepository.count(),
    ]);

    return {
      users,
      buildings: {
        total: buildingsTotal,
      },
      rooms: {
        total: roomsTotal,
        available: roomsAvailable,
        occupied: roomsOccupied,
        maintenance: roomsMaintenance,
        occupancyRate:
          roomsTotal === 0
            ? 0
            : Number(((roomsOccupied / roomsTotal) * 100).toFixed(2)),
      },
      students: {
        total: studentsTotal,
        active: studentsActive,
      },
      contracts: {
        total: contractsTotal,
        active: contractsActive,
        expired: contractsExpired,
      },
      payments: {
        total: paymentsTotal,
        paid: paymentsPaid,
        pending: paymentsPending,
        overdue: paymentsOverdue,
      },
      revenue: {
        total: Number(revenue),
      },
      utilityBills: {
        total: utilityBillsTotal,
        published: utilityBillsPublished,
        draft: utilityBillsDraft,
      },
      supportRequests: {
        total: supportRequestsTotal,
        pending: supportRequestsPending,
        processing: supportRequestsProcessing,
        resolved: supportRequestsResolved,
      },
      roomChangeRequests: {
        total: roomChangeRequestsTotal,
        pending: requestPendingManager,
        approved: requestApprovedManager,
        rejected: requestRejectedManager,
      },
      announcements: {
        total: announcementsTotal,
      },
      regulations: {
        total: regulationsTotal,
      },
    };
  }

  private async countQuery(query: string, params: any[]): Promise<number> {
    const result = await this.dataSource.manager.query(query, params);
    return Number(result?.[0]?.count ?? 0);
  }
}
