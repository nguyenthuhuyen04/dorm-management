import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { UsersModule } from '../users/users.module';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Student,
      Building,
      Room,
      Contract,
      Payment,
      UtilityBill,
      SupportRequest,
      RoomChangeRequest,
      Announcement,
      Regulation,
    ]),
    UsersModule,
  ],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    UsersRepository,
    StudentsRepository,
    BuildingsRepository,
    RoomsRepository,
    ContractsRepository,
    PaymentsRepository,
    UtilityBillsRepository,
    SupportRequestsRepository,
    RoomChangeRequestsRepository,
    AnnouncementsRepository,
    RegulationsRepository,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
