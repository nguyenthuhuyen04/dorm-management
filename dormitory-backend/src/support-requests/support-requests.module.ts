import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportRequest } from './support-request.entity';
import { SupportRequestsController } from './support-requests.controller';
import { SupportRequestsService } from './support-requests.service';
import { SupportRequestsRepository } from './support-requests.repository';

@Module({
  imports: [TypeOrmModule.forFeature([SupportRequest])],
  controllers: [SupportRequestsController],
  providers: [SupportRequestsService, SupportRequestsRepository],
  exports: [SupportRequestsService],
})
export class SupportRequestsModule {}