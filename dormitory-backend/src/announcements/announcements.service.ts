import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AnnouncementsRepository } from './announcements.repository';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { Announcement } from './announcement.entity';
import { User, UserRole } from '../users/user.entity';
import { TargetRole } from '../common/enums/user-role.enum';

interface AuthenticatedUser {
  userId: number;
  role: UserRole;
}

interface FindAnnouncementsQuery {
  page?: number;
  limit?: number;
  search?: string;
  target_role?: string;
  created_by?: string;
}

interface AnnouncementResponse {
  id: number;
  title: string;
  content: string;
  targetRole: string;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  creator: {
    id: number;
    fullName: string;
  } | null;
}

interface PaginatedAnnouncementsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: AnnouncementResponse[];
}

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly announcementsRepository: AnnouncementsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  private toAnnouncementResponse(
    announcement: Announcement,
  ): AnnouncementResponse {
    return {
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      targetRole: announcement.targetRole,
      createdBy: announcement.createdBy,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
      creator: announcement.creator
        ? {
            id: announcement.creator.id,
            fullName: announcement.creator.fullName,
          }
        : null,
    };
  }

  async findAll(
    query: FindAnnouncementsQuery,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedAnnouncementsResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.announcementsRepository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.creator', 'creator');

    // STUDENT: only see announcements where target_role = ALL or STUDENT
    if (currentUser.role === UserRole.STUDENT) {
      queryBuilder.andWhere(
        '(announcement.targetRole = :targetAll OR announcement.targetRole = :targetStudent)',
        { targetAll: TargetRole.ALL, targetStudent: TargetRole.STUDENT },
      );
    }

    // MANAGER: only see announcements where target_role = ALL or MANAGER
    if (currentUser.role === UserRole.MANAGER) {
      queryBuilder.andWhere(
        '(announcement.targetRole = :targetAll OR announcement.targetRole = :targetManager)',
        { targetAll: TargetRole.ALL, targetManager: TargetRole.MANAGER },
      );
    }

    // Search
    if (query.search) {
      const search = `%${query.search.toLowerCase()}%`;
      queryBuilder.andWhere(
        '(LOWER(announcement.title) LIKE :search OR LOWER(announcement.content) LIKE :search)',
        { search },
      );
    }

    // Filters
    if (query.target_role) {
      queryBuilder.andWhere('announcement.targetRole = :targetRole', {
        targetRole: query.target_role,
      });
    }

    if (query.created_by) {
      queryBuilder.andWhere('announcement.createdBy = :createdBy', {
        createdBy: Number(query.created_by),
      });
    }

    // Sorting: newest first
    queryBuilder.orderBy('announcement.createdAt', 'DESC');

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      data: data.map((announcement) =>
        this.toAnnouncementResponse(announcement),
      ),
    };
  }

  async findOne(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<AnnouncementResponse> {
    const announcement = await this.announcementsRepository.findById(id);
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    // STUDENT: only see announcements where target_role = ALL or STUDENT
    if (currentUser.role === UserRole.STUDENT) {
      if (
        announcement.targetRole !== TargetRole.ALL &&
        announcement.targetRole !== TargetRole.STUDENT
      ) {
        throw new ForbiddenException('Access denied');
      }
    }

    // MANAGER: only see announcements where target_role = ALL or MANAGER
    if (currentUser.role === UserRole.MANAGER) {
      if (
        announcement.targetRole !== TargetRole.ALL &&
        announcement.targetRole !== TargetRole.MANAGER
      ) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.toAnnouncementResponse(announcement);
  }

  async create(
    createAnnouncementDto: CreateAnnouncementDto,
    currentUser: AuthenticatedUser,
  ): Promise<AnnouncementResponse> {
    // Check user exists
    const user = await this.dataSource.manager.findOne(User, {
      where: { id: currentUser.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const announcementRepo =
          transactionalEntityManager.getRepository(Announcement);

        const announcement = announcementRepo.create({
          title: createAnnouncementDto.title,
          content: createAnnouncementDto.content,
          targetRole: createAnnouncementDto.target_role,
          createdBy: currentUser.userId,
        });

        const savedAnnouncement = await announcementRepo.save(announcement);

        const fullAnnouncement = await announcementRepo.findOne({
          where: { id: savedAnnouncement.id },
          relations: ['creator'],
        });

        if (!fullAnnouncement) {
          throw new NotFoundException('Announcement not found after creation');
        }

        return this.toAnnouncementResponse(fullAnnouncement);
      },
    );
  }

  async update(
    id: number,
    updateAnnouncementDto: UpdateAnnouncementDto,
    currentUser: AuthenticatedUser,
  ): Promise<AnnouncementResponse> {
    const announcement = await this.announcementsRepository.findById(id);
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    // MANAGER: can only update own announcements
    if (currentUser.role === UserRole.MANAGER) {
      if (announcement.createdBy !== currentUser.userId) {
        throw new ForbiddenException(
          'You can only update your own announcements',
        );
      }
    }

    // Apply updates
    if (updateAnnouncementDto.title !== undefined) {
      announcement.title = updateAnnouncementDto.title;
    }
    if (updateAnnouncementDto.content !== undefined) {
      announcement.content = updateAnnouncementDto.content;
    }
    if (updateAnnouncementDto.target_role !== undefined) {
      announcement.targetRole = updateAnnouncementDto.target_role;
    }

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const announcementRepo =
          transactionalEntityManager.getRepository(Announcement);
        await announcementRepo.save(announcement);

        const updatedAnnouncement = await announcementRepo.findOne({
          where: { id },
          relations: ['creator'],
        });

        if (!updatedAnnouncement) {
          throw new NotFoundException('Announcement not found after update');
        }

        return this.toAnnouncementResponse(updatedAnnouncement);
      },
    );
  }

  async remove(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const announcement = await this.announcementsRepository.findById(id);
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    // MANAGER: can only delete own announcements
    if (currentUser.role === UserRole.MANAGER) {
      if (announcement.createdBy !== currentUser.userId) {
        throw new ForbiddenException(
          'You can only delete your own announcements',
        );
      }
    }

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const announcementRepo =
          transactionalEntityManager.getRepository(Announcement);
        await announcementRepo.delete(id);

        return { message: 'Announcement deleted successfully' };
      },
    );
  }
}
