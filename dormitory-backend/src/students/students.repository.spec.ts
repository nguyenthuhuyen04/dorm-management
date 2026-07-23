import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { StudentsRepository } from './students.repository';
import { Student } from './student.entity';
import { getDataSourceToken } from '@nestjs/typeorm';

describe('StudentsRepository', () => {
  let repository: StudentsRepository;
  let dataSource: any;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
  };

  const mockRepositoryMethods = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    count: jest.fn(),
    find: jest.fn(),
  };

  const mockManager = {
    getRepository: jest.fn().mockReturnValue(mockRepositoryMethods),
    query: jest.fn(),
    transaction: jest.fn(),
    createEntityManager: jest.fn(),
  };

  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn().mockReturnValue(mockManager),
    };

    repository = new StudentsRepository(dataSource as any);
    // Override the manager property
    Object.defineProperty(repository, 'manager', {
      value: mockManager,
      writable: true,
    });
    // Override repository methods
    (repository as any).findOne = mockRepositoryMethods.findOne;
    (repository as any).createQueryBuilder =
      mockRepositoryMethods.createQueryBuilder;
    (repository as any).count = mockRepositoryMethods.count;
    (repository as any).find = mockRepositoryMethods.find;

    jest.clearAllMocks();
  });

  // ─── findById ───────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should find a student by id with user relation', async () => {
      const mockStudent = {
        id: 1,
        userId: 3,
        studentCode: 'SV001',
        user: { id: 3 },
      };
      mockRepositoryMethods.findOne.mockResolvedValue(mockStudent);

      const result = await repository.findById(1);

      expect(mockRepositoryMethods.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['user'],
      });
      expect(result).toEqual(mockStudent);
    });

    it('should return null when student not found', async () => {
      mockRepositoryMethods.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  // ─── findByStudentCode ──────────────────────────────────────────────────

  describe('findByStudentCode', () => {
    it('should find a student by student code (case insensitive)', async () => {
      const mockStudent = { id: 1, studentCode: 'SV001' };
      mockQueryBuilder.getOne.mockResolvedValue(mockStudent);

      const result = await repository.findByStudentCode('SV001');

      expect(mockRepositoryMethods.createQueryBuilder).toHaveBeenCalledWith(
        'student',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(student.studentCode) = LOWER(:studentCode)',
        { studentCode: 'SV001' },
      );
      expect(result).toEqual(mockStudent);
    });

    it('should return null when student code not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await repository.findByStudentCode('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  // ─── findByUserId ───────────────────────────────────────────────────────

  describe('findByUserId', () => {
    it('should find a student by user id with user relation', async () => {
      const mockStudent = { id: 1, userId: 3, user: { id: 3 } };
      mockRepositoryMethods.findOne.mockResolvedValue(mockStudent);

      const result = await repository.findByUserId(3);

      expect(mockRepositoryMethods.findOne).toHaveBeenCalledWith({
        where: { userId: 3 },
        relations: ['user'],
      });
      expect(result).toEqual(mockStudent);
    });

    it('should return null when user id not linked to any student', async () => {
      mockRepositoryMethods.findOne.mockResolvedValue(null);

      const result = await repository.findByUserId(999);

      expect(result).toBeNull();
    });
  });

  // ─── managerQueryHasAccessToStudent ─────────────────────────────────────

  describe('managerQueryHasAccessToStudent', () => {
    it('should return true when manager has access to student', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 1 }]);

      const result = await repository.managerQueryHasAccessToStudent(1, 2);

      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT EXISTS'),
        [1, 2],
      );
      expect(result).toBe(true);
    });

    it('should return false when manager has no access to student', async () => {
      mockManager.query.mockResolvedValue([{ has_access: 0 }]);

      const result = await repository.managerQueryHasAccessToStudent(1, 999);

      expect(result).toBe(false);
    });

    it('should handle empty result set', async () => {
      mockManager.query.mockResolvedValue([]);

      const result = await repository.managerQueryHasAccessToStudent(1, 2);

      expect(result).toBe(false);
    });

    it('should handle null result', async () => {
      mockManager.query.mockResolvedValue(null);

      const result = await repository.managerQueryHasAccessToStudent(1, 2);

      expect(result).toBe(false);
    });
  });

  // ─── hasActiveContractForStudent ────────────────────────────────────────

  describe('hasActiveContractForStudent', () => {
    it('should return true when student has active contracts', async () => {
      mockRepositoryMethods.count.mockResolvedValue(1);

      const result = await repository.hasActiveContractForStudent(1);

      expect(mockManager.getRepository).toHaveBeenCalled();
      expect(mockRepositoryMethods.count).toHaveBeenCalledWith({
        where: { studentId: 1, status: 'ACTIVE' },
      });
      expect(result).toBe(true);
    });

    it('should return false when student has no active contracts', async () => {
      mockRepositoryMethods.count.mockResolvedValue(0);

      const result = await repository.hasActiveContractForStudent(1);

      expect(result).toBe(false);
    });
  });

  // ─── hasPaymentForStudent ───────────────────────────────────────────────

  describe('hasPaymentForStudent', () => {
    it('should return true when student has payments', async () => {
      mockRepositoryMethods.count.mockResolvedValue(1);

      const result = await repository.hasPaymentForStudent(1);

      expect(mockManager.getRepository).toHaveBeenCalled();
      expect(mockRepositoryMethods.count).toHaveBeenCalledWith({
        where: { studentId: 1 },
      });
      expect(result).toBe(true);
    });

    it('should return false when student has no payments', async () => {
      mockRepositoryMethods.count.mockResolvedValue(0);

      const result = await repository.hasPaymentForStudent(1);

      expect(result).toBe(false);
    });
  });

  // ─── hasRoomChangeRequestForStudent ─────────────────────────────────────

  describe('hasRoomChangeRequestForStudent', () => {
    it('should return true when student has room change requests', async () => {
      mockRepositoryMethods.count.mockResolvedValue(1);

      const result = await repository.hasRoomChangeRequestForStudent(1);

      expect(mockManager.getRepository).toHaveBeenCalled();
      expect(mockRepositoryMethods.count).toHaveBeenCalledWith({
        where: { studentId: 1 },
      });
      expect(result).toBe(true);
    });

    it('should return false when student has no room change requests', async () => {
      mockRepositoryMethods.count.mockResolvedValue(0);

      const result = await repository.hasRoomChangeRequestForStudent(1);

      expect(result).toBe(false);
    });
  });

  // ─── hasSupportRequestForStudent ────────────────────────────────────────

  describe('hasSupportRequestForStudent', () => {
    it('should return true when student has support requests', async () => {
      mockRepositoryMethods.count.mockResolvedValue(1);

      const result = await repository.hasSupportRequestForStudent(1);

      expect(mockManager.getRepository).toHaveBeenCalled();
      expect(mockRepositoryMethods.count).toHaveBeenCalledWith({
        where: { studentId: 1 },
      });
      expect(result).toBe(true);
    });

    it('should return false when student has no support requests', async () => {
      mockRepositoryMethods.count.mockResolvedValue(0);

      const result = await repository.hasSupportRequestForStudent(1);

      expect(result).toBe(false);
    });
  });
});
