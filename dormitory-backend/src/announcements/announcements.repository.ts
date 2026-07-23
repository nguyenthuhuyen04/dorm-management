import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Announcement } from './announcement.entity';

@Injectable()
export class AnnouncementsRepository extends Repository<Announcement> {
  constructor(dataSource: DataSource) {
    super(Announcement, dataSource.createEntityManager());
  }

  async findById(id: number): Promise<Announcement | null> {
    return this.findOne({
      where: { id },
      relations: ['creator'],
    });
  }

  async findByCreator(createdBy: number): Promise<Announcement[]> {
    return this.find({
      where: { createdBy },
      relations: ['creator'],
      order: { createdAt: 'DESC' },
    });
  }

  async managerOwnsAnnouncement(
    announcementId: number,
    managerId: number,
  ): Promise<boolean> {
    const result = await this.manager.query(
      `SELECT EXISTS(
        SELECT 1
        FROM announcements a
        WHERE a.id = ? AND a.created_by = ?
      ) AS has_access`,
      [announcementId, managerId],
    );
    return Boolean(Number(result?.[0]?.has_access ?? 0));
  }
}
