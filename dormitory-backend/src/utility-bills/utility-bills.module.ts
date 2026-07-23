import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UtilityBill } from './utility-bill.entity';
import { UtilityBillsController } from './utility-bills.controller';
import { UtilityBillsService } from './utility-bills.service';
import { UtilityBillsRepository } from './utility-bills.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UtilityBill])],
  controllers: [UtilityBillsController],
  providers: [UtilityBillsService, UtilityBillsRepository],
  exports: [UtilityBillsService],
})
export class UtilityBillsModule {}
