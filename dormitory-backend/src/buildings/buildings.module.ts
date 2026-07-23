import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { BuildingsRepository } from './buildings.repository';
import { Building } from './building.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Building]), UsersModule],
  controllers: [BuildingsController],
  providers: [BuildingsService, BuildingsRepository],
  exports: [BuildingsService],
})
export class BuildingsModule {}
