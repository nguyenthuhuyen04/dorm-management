import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { Building } from './building.entity';
import { BuildingsRepository } from './buildings.repository';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { UserRole } from '../users/user.entity';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';

interface AuthenticatedUser {
  userId: number;
  role: UserRole;
}

interface FindBuildingsParams {
  page?: number;
  limit?: number;
  search?: string;
  gender?: string;
}

interface PublicBuildingResponse {
  id: number;
  buildingName: string;
  gender: string;
  description: string | null;
  createdAt: Date;
  manager: {
    id: number;
    username: string;
    fullName: string;
    email: string | null;
    role: UserRole;
  } | null;
}

@Injectable()
export class BuildingsService {
  constructor(
    private readonly buildingsRepository: BuildingsRepository,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    query: FindBuildingsParams,
    currentUser: AuthenticatedUser,
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    data: Array<PublicBuildingResponse | null>;
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const queryBuilder =
      this.buildingsRepository.createQueryBuilder('building');
    queryBuilder.leftJoinAndSelect('building.manager', 'manager');

    if (currentUser.role === UserRole.MANAGER) {
      queryBuilder.where('building.manager_id = :managerId', {
        managerId: currentUser.userId,
      });
    }

    if (query.search) {
      queryBuilder.andWhere('building.building_name LIKE :search', {
        search: `%${query.search}%`,
      });
    }

    if (query.gender) {
      queryBuilder.andWhere('building.gender = :gender', {
        gender: query.gender,
      });
    }

    queryBuilder.orderBy('building.id', 'ASC');
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: data.map((building) => this.toPublicBuilding(building)),
    };
  }

  async findOne(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<PublicBuildingResponse | null> {
    const building = await this.buildingsRepository.findById(id);

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    if (
      currentUser.role === UserRole.MANAGER &&
      (!building.manager || building.manager.id !== currentUser.userId)
    ) {
      throw new ForbiddenException('Access denied');
    }

    return this.toPublicBuilding(building);
  }

  async create(
    createBuildingDto: CreateBuildingDto,
  ): Promise<PublicBuildingResponse | null> {
    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const buildingRepo = transactionalEntityManager.getRepository(Building);
        const userRepo = transactionalEntityManager.getRepository(User);

        const existing = await buildingRepo.findOne({
          where: { buildingName: createBuildingDto.building_name },
        });
        if (existing) {
          throw new ConflictException('building_name already exists');
        }

        const manager = await userRepo.findOne({
          where: { id: createBuildingDto.manager_id },
        });
        if (!manager) {
          throw new NotFoundException('User not found');
        }
        if (manager.role !== UserRole.MANAGER) {
          throw new BadRequestException('manager must have role MANAGER');
        }

        const managedBuilding = await buildingRepo.findOne({
          where: { manager: { id: createBuildingDto.manager_id } },
          relations: ['manager'],
        });
        if (managedBuilding) {
          throw new BadRequestException(
            'manager already manages another building',
          );
        }

        const building = buildingRepo.create({
          buildingName: createBuildingDto.building_name,
          gender: createBuildingDto.gender,
          manager,
          description: createBuildingDto.description,
        });

        const savedBuilding = await buildingRepo.save(building);
        const reloadedBuilding = await buildingRepo.findOne({
          where: { id: savedBuilding.id },
          relations: ['manager'],
        });
        return this.toPublicBuilding(reloadedBuilding);
      },
    );
  }

  async update(
    id: number,
    updateBuildingDto: UpdateBuildingDto,
  ): Promise<PublicBuildingResponse | null> {
    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const buildingRepo = transactionalEntityManager.getRepository(Building);
        const userRepo = transactionalEntityManager.getRepository(User);

        const building = await buildingRepo.findOne({
          where: { id },
          relations: ['manager'],
        });

        if (!building) {
          throw new NotFoundException('Building not found');
        }

        if (updateBuildingDto.building_name) {
          const nameConflict = await buildingRepo.findOne({
            where: { buildingName: updateBuildingDto.building_name },
          });
          if (nameConflict && nameConflict.id !== id) {
            throw new ConflictException('building_name already exists');
          }
          building.buildingName = updateBuildingDto.building_name;
        }

        if (updateBuildingDto.gender) {
          building.gender = updateBuildingDto.gender;
        }

        if (updateBuildingDto.manager_id !== undefined) {
          const manager = await userRepo.findOne({
            where: { id: updateBuildingDto.manager_id },
          });
          if (!manager) {
            throw new NotFoundException('User not found');
          }
          if (manager.role !== UserRole.MANAGER) {
            throw new BadRequestException('manager must have role MANAGER');
          }

          const managedBuilding = await buildingRepo.findOne({
            where: { manager: { id: updateBuildingDto.manager_id } },
            relations: ['manager'],
          });
          if (managedBuilding && managedBuilding.id !== id) {
            throw new BadRequestException(
              'manager already manages another building',
            );
          }
          building.manager = manager;
        }

        if (updateBuildingDto.description !== undefined) {
          building.description = updateBuildingDto.description;
        }

        await buildingRepo.save(building);
        const updatedBuilding = await buildingRepo.findOne({
          where: { id },
          relations: ['manager'],
        });
        return this.toPublicBuilding(updatedBuilding);
      },
    );
  }

  async remove(id: number): Promise<{ message: string }> {
    const building = await this.buildingsRepository.findOne({ where: { id } });
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const roomCount = await this.buildingsRepository.countRooms(id);
    if (roomCount > 0) {
      throw new BadRequestException(
        'Cannot delete building with existing rooms',
      );
    }

    await this.buildingsRepository.delete(id);
    return { message: 'Building deleted successfully' };
  }

  private toPublicBuilding(
    building: Building | null,
  ): PublicBuildingResponse | null {
    if (!building) {
      return null;
    }

    return {
      id: building.id,
      buildingName: building.buildingName,
      gender: building.gender,
      description: building.description,
      createdAt: building.createdAt,
      manager: building.manager
        ? {
            id: building.manager.id,
            username: building.manager.username,
            fullName: building.manager.fullName,
            email: building.manager.email,
            role: building.manager.role,
          }
        : null,
    };
  }
}
