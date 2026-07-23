import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RegulationsRepository } from './regulations.repository';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { UpdateRegulationDto } from './dto/update-regulation.dto';
import { Regulation } from './regulation.entity';
import { User, UserRole } from '../users/user.entity';

interface AuthenticatedUser {
  userId: number;
  role: UserRole;
}

interface FindRegulationsQuery {
  page?: number;
  limit?: number;
  search?: string;
  created_by?: string;
}

interface RegulationResponse {
  id: number;
  title: string;
  content: string;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  creator: {
    id: number;
    fullName: string;
  } | null;
}

interface PaginatedRegulationsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: RegulationResponse[];
}

@Injectable()
export class RegulationsService {
  constructor(
    private readonly regulationsRepository: RegulationsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  private toRegulationResponse(regulation: Regulation): RegulationResponse {
    return {
      id: regulation.id,
      title: regulation.title,
      content: regulation.content,
      createdBy: regulation.createdBy,
      createdAt: regulation.createdAt,
      updatedAt: regulation.updatedAt,
      creator: regulation.creator
        ? {
            id: regulation.creator.id,
            fullName: regulation.creator.fullName,
          }
        : null,
    };
  }

  async findAll(
    query: FindRegulationsQuery,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedRegulationsResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.regulationsRepository
      .createQueryBuilder('regulation')
      .leftJoinAndSelect('regulation.creator', 'creator');

    // Search
    if (query.search) {
      const search = `%${query.search.toLowerCase()}%`;
      queryBuilder.andWhere(
        '(LOWER(regulation.title) LIKE :search OR LOWER(regulation.content) LIKE :search)',
        { search },
      );
    }

    // Filter by created_by
    if (query.created_by) {
      queryBuilder.andWhere('regulation.createdBy = :createdBy', {
        createdBy: Number(query.created_by),
      });
    }

    // Sorting: updated_at DESC, created_at DESC
    queryBuilder
      .orderBy('regulation.updatedAt', 'DESC')
      .addOrderBy('regulation.createdAt', 'DESC');

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      data: data.map((regulation) => this.toRegulationResponse(regulation)),
    };
  }

  async findOne(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<RegulationResponse> {
    const regulation = await this.regulationsRepository.findById(id);
    if (!regulation) {
      throw new NotFoundException('Regulation not found');
    }

    return this.toRegulationResponse(regulation);
  }

  async create(
    createRegulationDto: CreateRegulationDto,
    currentUser: AuthenticatedUser,
  ): Promise<RegulationResponse> {
    // Check user exists
    const user = await this.dataSource.manager.findOne(User, {
      where: { id: currentUser.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Trim whitespace
    const title = createRegulationDto.title.trim();
    const content = createRegulationDto.content.trim();

    // Check whitespace-only
    if (!title) {
      throw new ConflictException('Title must not be only whitespace');
    }
    if (!content) {
      throw new ConflictException('Content must not be only whitespace');
    }

    // Check duplicate title
    const existingRegulation = await this.dataSource.manager.findOne(
      Regulation,
      { where: { title } },
    );
    if (existingRegulation) {
      throw new ConflictException('Regulation with this title already exists');
    }

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const regulationRepo =
          transactionalEntityManager.getRepository(Regulation);

        const regulation = regulationRepo.create({
          title,
          content,
          createdBy: currentUser.userId,
        });

        const savedRegulation = await regulationRepo.save(regulation);

        const fullRegulation = await regulationRepo.findOne({
          where: { id: savedRegulation.id },
          relations: ['creator'],
        });

        if (!fullRegulation) {
          throw new NotFoundException('Regulation not found after creation');
        }

        return this.toRegulationResponse(fullRegulation);
      },
    );
  }

  async update(
    id: number,
    updateRegulationDto: UpdateRegulationDto,
    currentUser: AuthenticatedUser,
  ): Promise<RegulationResponse> {
    const regulation = await this.regulationsRepository.findById(id);
    if (!regulation) {
      throw new NotFoundException('Regulation not found');
    }

    // Apply updates with trim
    if (updateRegulationDto.title !== undefined) {
      const title = updateRegulationDto.title.trim();
      if (!title) {
        throw new ConflictException('Title must not be only whitespace');
      }

      // Check duplicate title (exclude current regulation)
      if (title !== regulation.title) {
        const existingRegulation = await this.dataSource.manager.findOne(
          Regulation,
          { where: { title } },
        );
        if (existingRegulation) {
          throw new ConflictException(
            'Regulation with this title already exists',
          );
        }
      }

      regulation.title = title;
    }

    if (updateRegulationDto.content !== undefined) {
      const content = updateRegulationDto.content.trim();
      if (!content) {
        throw new ConflictException('Content must not be only whitespace');
      }
      regulation.content = content;
    }

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const regulationRepo =
          transactionalEntityManager.getRepository(Regulation);
        await regulationRepo.save(regulation);

        const updatedRegulation = await regulationRepo.findOne({
          where: { id },
          relations: ['creator'],
        });

        if (!updatedRegulation) {
          throw new NotFoundException('Regulation not found after update');
        }

        return this.toRegulationResponse(updatedRegulation);
      },
    );
  }

  async remove(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const regulation = await this.regulationsRepository.findById(id);
    if (!regulation) {
      throw new NotFoundException('Regulation not found');
    }

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const regulationRepo =
          transactionalEntityManager.getRepository(Regulation);
        await regulationRepo.delete(id);

        return { message: 'Regulation deleted successfully' };
      },
    );
  }
}
