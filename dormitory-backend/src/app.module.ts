import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { UsersModule } from './users/users.module';
import { BuildingsModule } from './buildings/buildings.module';
import { ContractsModule } from './contracts/contracts.module';
import { StudentsModule } from './students/students.module';
import { RoomsModule } from './rooms/rooms.module';
import { UtilityBillsModule } from './utility-bills/utility-bills.module';
import { PaymentsModule } from './payments/payments.module';
import { RegulationsModule } from './regulations/regulations.module';
import { SupportRequestsModule } from './support-requests/support-requests.module';
import { RoomChangeRequestsModule } from './room-change-requests/room-change-requests.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { getDatabaseConfig } from './config/database.config';
import { RolesGuard } from './auth/roles.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
    }),
    UsersModule,
    BuildingsModule,
    ContractsModule,
    StudentsModule,
    RoomsModule,
    UtilityBillsModule,
    PaymentsModule,
    AnnouncementsModule,
    RegulationsModule,
    AuthModule,
    SupportRequestsModule,
    RoomChangeRequestsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
