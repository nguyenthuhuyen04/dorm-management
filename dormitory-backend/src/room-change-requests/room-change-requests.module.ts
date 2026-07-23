import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomChangeRequestsController } from './room-change-requests.controller';
import { RoomChangeRequestsService } from './room-change-requests.service';
import { RoomChangeRequestsRepository } from './room-change-requests.repository';
import { RoomChangeRequest } from './room-change-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoomChangeRequest])],
  controllers: [RoomChangeRequestsController],
  providers: [RoomChangeRequestsService, RoomChangeRequestsRepository],
  exports: [RoomChangeRequestsService],
})
export class RoomChangeRequestsModule {}
