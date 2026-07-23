import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Regulation } from './regulation.entity';
import { RegulationsController } from './regulations.controller';
import { RegulationsService } from './regulations.service';
import { RegulationsRepository } from './regulations.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Regulation])],
  controllers: [RegulationsController],
  providers: [RegulationsService, RegulationsRepository],
  exports: [RegulationsService],
})
export class RegulationsModule {}
