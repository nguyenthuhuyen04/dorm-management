import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from './students.service';
import { StudentsRepository } from './students.repository';
import { UsersService } from '../users/users.service';
import { Student } from './student.entity';
import { UserRole, UserStatus } from '../users/user.entity';

describe('StudentsService', () => {
  let service: StudentsService;
  let usersService: any;
  let studentsRepository: any;

  const mockQueryBuilder = () => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      distinct: jest.fn().mockReturnThis(),
    };
    return qb;
  };

  const mockTransactionManager = () => {
    const manager: any = {
      getRepository: jest.fn((entity: any) => {
        if (entity.name === 'User') {
          return {
            findOne: jest.fn(async ({ where }: any) => {
              if ((where?.id ?? where?.where?.id) === 999) return null;
              return {
                id: (where?.id ?? where?.where?.id) || 10,
                status: UserStatus.ACTIVE,
                role: UserRole.STUDENT,
                email: null,
                phone: null,
                save: jest.fn(),
              };
            }),
            save: jest.fn(async (value: any) => value),
          };
        }
        if (entity.name === 'Student') {
          return {
            findOne: jest.fn(async ({ where }: any) => {
              if (where?.id === 999 || where?.id === 9999) return null;
              return {
                id: where?.id ?? 1,
                userId: 10,
                studentCode: 'SV100',
                gender: null,
                birthday: null,
                faculty: null,
                className: null,
                address: null,
                parentPhone: null,
                createdAt: new Date(),
                user: {
                  id: 10,
                  username: 'student',
                  fullName: 'Test Student',
                  email: null,
                  phone: null,
                  role: UserRole.STUDENT,
                  status: UserStatus.ACTIVE,
                  createdAt: new Date(),
                },
              };
            }),
            save: jest.fn(async (value: any) => ({
              ...value,
              id: value.id ?? 50,
            })),
          };
        }
        return {
          findOne: jest.fn().mockResolvedValue(null),
          save: jest.fn(async (v: any) => v),
        };
      }),
      query: jest.fn(),
    };
    return manager;
  };

  const createServiceWithMocks = (
    repoMockOverrides?: Record<string, any>,
    userServiceOverrides?: Record<string, any>,
  ) => {
    const repo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(mockQueryBuilder),
      findByStudentCode: jest.fn(),
      findByUserId: jest.fn(),
      findById: jest.fn(),
      hasActiveContractForStudent: jest.fn(),
      hasPaymentForStudent: jest.fn(),
      hasRoomChangeRequestForStudent: jest.fn(),
      hasSupportRequestForStudent: jest.fn(),
      find: jest.fn(),
      managerQueryHasAccessToStudent: jest.fn(),
      manager: {
        transaction: jest.fn(async (callback: any) => {
          return callback(mockTransactionManager());
        }),
      },
      ...(repoMockOverrides || {}),
    };

    const us = {
      findOne: jest.fn(),
      update: jest.fn(),
      ...(userServiceOverrides || {}),
    };

    const svc = new StudentsService(repo as any, us as any);
    return { service: svc, repo, usersService: us };
  };

  // ─── CREATE ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a student successfully', async () => {
      const { service, repo, usersService } = createServiceWithMocks();

      usersService.findOne.mockResolvedValue({
        id: 10,
        role: UserRole.STUDENT,
      });
      repo.findByStudentCode.mockResolvedValue(null);
      repo.findByUserId.mockResolvedValue(null);
      repo.create.mockReturnValue({ id: 50 });

      const result = await service.create(
        {
          user_id: 10,
          student_code: 'SV100',
          email: 'student@example.com',
          phone: '0900000000',
        } as any,
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(result).toBeDefined();
      expect(result.studentCode).toBe('SV100');
      expect(usersService.findOne).toHaveBeenCalledWith(10);
      expect(repo.findByStudentCode).toHaveBeenCalledWith('SV100');
      expect(repo.findByUserId).toHaveBeenCalledWith(10);
      expect(repo.create).toHaveBeenCalled();
    });

    it('should create a student without optional email/phone', async () => {
      const { service, repo, usersService } = createServiceWithMocks();

      usersService.findOne.mockResolvedValue({
        id: 11,
        role: UserRole.STUDENT,
      });
      repo.findByStudentCode.mockResolvedValue(null);
      repo.findByUserId.mockResolvedValue(null);
      repo.create.mockReturnValue({ id: 51, studentCode: 'SV101' });

      // Override transaction to return a student with SV101 studentCode
      const customManager = {
        getRepository: jest.fn((entity: any) => {
          if (entity.name === 'User') {
            return {
              findOne: jest.fn().mockResolvedValue({
                id: 11,
                status: UserStatus.ACTIVE,
                role: UserRole.STUDENT,
              }),
              save: jest.fn(async (v: any) => v),
            };
          }
          if (entity.name === 'Student') {
            return {
              findOne: jest.fn().mockResolvedValue({
                id: 51,
                userId: 11,
                studentCode: 'SV101',
                gender: null,
                birthday: null,
                faculty: null,
                className: null,
                address: null,
                parentPhone: null,
                createdAt: new Date(),
                user: {
                  id: 11,
                  username: 'student',
                  fullName: 'Test Student',
                  email: null,
                  phone: null,
                  role: UserRole.STUDENT,
                  status: UserStatus.ACTIVE,
                  createdAt: new Date(),
                },
              }),
              save: jest.fn(async (v: any) => v),
            };
          }
          return { findOne: jest.fn(), save: jest.fn() };
        }),
      };

      repo.manager.transaction.mockImplementation(async (callback: any) =>
        callback(customManager),
      );

      const result = await service.create(
        { user_id: 11, student_code: 'SV101' } as any,
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(result).toBeDefined();
      expect(result.studentCode).toBe('SV101');
    });

    it('should reject create when linked user is not a STUDENT', async () => {
      const { service, repo, usersService } = createServiceWithMocks();

      usersService.findOne.mockResolvedValue({
        id: 10,
        role: UserRole.MANAGER,
      });

      await expect(
        service.create({ user_id: 10, student_code: 'SV100' } as any, {
          userId: 1,
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject create when student_code already exists', async () => {
      const { service, repo, usersService } = createServiceWithMocks();

      usersService.findOne.mockResolvedValue({
        id: 10,
        role: UserRole.STUDENT,
      });
      repo.findByStudentCode.mockResolvedValue({ id: 1 });
      repo.findByUserId.mockResolvedValue(null);

      await expect(
        service.create({ user_id: 10, student_code: 'SV100' } as any, {
          userId: 1,
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject create when user_id already linked to another student', async () => {
      const { service, repo, usersService } = createServiceWithMocks();

      usersService.findOne.mockResolvedValue({
        id: 10,
        role: UserRole.STUDENT,
      });
      repo.findByStudentCode.mockResolvedValue(null);
      repo.findByUserId.mockResolvedValue({ id: 99 });

      await expect(
        service.create({ user_id: 10, student_code: 'SV100' } as any, {
          userId: 1,
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should use transaction for creation with user profile update', async () => {
      const { service, repo, usersService } = createServiceWithMocks();

      usersService.findOne.mockResolvedValue({
        id: 10,
        role: UserRole.STUDENT,
      });
      repo.findByStudentCode.mockResolvedValue(null);
      repo.findByUserId.mockResolvedValue(null);
      repo.create.mockReturnValue({ id: 50 });

      await service.create(
        {
          user_id: 10,
          student_code: 'SV100',
          email: 'test@test.com',
        } as any,
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(repo.manager.transaction).toHaveBeenCalled();
    });

    it('should reject create when user not found in usersService', async () => {
      const { service, usersService } = createServiceWithMocks();

      usersService.findOne.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        service.create({ user_id: 999, student_code: 'SV999' } as any, {
          userId: 1,
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── FIND ALL ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated students for ADMIN', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([
        [
          {
            id: 1,
            userId: 3,
            studentCode: 'SV001',
            gender: 'Female',
            birthday: new Date('2005-09-10'),
            faculty: 'Công nghệ thông tin',
            className: 'CNTT01',
            address: 'Hải Dương',
            parentPhone: '0911111111',
            createdAt: new Date(),
            user: {
              id: 3,
              username: 'student1',
              fullName: 'Student One',
              email: null,
              phone: null,
              role: UserRole.STUDENT,
              status: UserStatus.ACTIVE,
              createdAt: new Date(),
            },
          },
        ],
        1,
      ]);

      const result = await service.findAll(
        { page: 1, limit: 10 },
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].studentCode).toBe('SV001');
      expect(qb.distinct).toHaveBeenCalledWith(true);
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('student.user', 'user');
    });

    it('should scope results for STUDENT role', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({}, { userId: 7, role: UserRole.STUDENT });

      expect(qb.where).toHaveBeenCalledWith('student.userId = :userId', {
        userId: 7,
      });
    });

    it('should scope results for MANAGER role', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({}, { userId: 2, role: UserRole.MANAGER });

      expect(qb.leftJoin).toHaveBeenCalledWith(
        'building.manager',
        'buildingManager',
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'buildingManager.id = :managerId',
        { managerId: 2 },
      );
    });

    it('should apply search query', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { search: 'SV001' },
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        expect.objectContaining({ search: expect.stringContaining('sv001') }),
      );
    });

    it('should apply faculty filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { faculty: 'Công nghệ' },
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('student.faculty'),
        expect.any(Object),
      );
    });

    it('should apply className filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { className: 'CNTT01' },
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('student.className'),
        expect.any(Object),
      );
    });

    it('should apply gender filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { gender: 'Female' },
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(qb.andWhere).toHaveBeenCalledWith('student.gender = :gender', {
        gender: 'Female',
      });
    });

    it('should apply building and room filters', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { building: 'A', room: '101' },
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(qb.leftJoin).toHaveBeenCalledWith('student.contracts', 'contract');
      expect(qb.leftJoin).toHaveBeenCalledWith('contract.room', 'room');
      expect(qb.leftJoin).toHaveBeenCalledWith('room.building', 'building');
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('building.buildingName'),
        expect.any(Object),
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('room.roomNumber'),
        expect.any(Object),
      );
    });

    it('should apply course filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { course: 'CNTT' },
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('student.className'),
        expect.objectContaining({ course: expect.stringContaining('cntt') }),
      );
    });

    it('should apply status filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { status: 'ACTIVE' },
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(qb.andWhere).toHaveBeenCalledWith('user.status = :status', {
        status: 'ACTIVE',
      });
    });

    it('should apply studentCode filter', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { studentCode: 'SV001' },
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('student.studentCode'),
        expect.any(Object),
      );
    });

    it('should apply pagination correctly', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { page: 2, limit: 5 },
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('should default to page 1 and limit 10 for invalid values', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { page: 0, limit: 0 },
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('should return empty result set gracefully', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(
        { search: 'ZZZZNONEXISTENT' },
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  // ─── FIND ONE ────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should find a student by id for ADMIN', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        id: 1,
        userId: 3,
        studentCode: 'SV001',
        gender: 'Female',
        birthday: new Date('2005-09-10'),
        faculty: 'Công nghệ thông tin',
        className: 'CNTT01',
        address: 'Hải Dương',
        parentPhone: '0911111111',
        createdAt: new Date(),
        user: {
          id: 3,
          username: 'student1',
          fullName: 'Student One',
          email: null,
          phone: null,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          createdAt: new Date(),
        },
      });

      const result = await service.findOne(1, {
        userId: 1,
        role: UserRole.ADMIN,
      });

      expect(result).toBeDefined();
      expect(result.studentCode).toBe('SV001');
    });

    it('should throw NotFoundException when student not found', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue(null);

      await expect(
        service.findOne(999, { userId: 1, role: UserRole.ADMIN }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow STUDENT to access their own profile', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        id: 1,
        userId: 7,
        studentCode: 'SV001',
        user: {
          id: 7,
          username: 'student1',
          fullName: 'Student One',
          role: UserRole.STUDENT,
        },
      });

      const result = await service.findOne(1, {
        userId: 7,
        role: UserRole.STUDENT,
      });

      expect(result).toBeDefined();
    });

    it('should reject STUDENT accessing another profile', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        id: 1,
        userId: 8,
        studentCode: 'SV001',
        user: {
          id: 8,
          role: UserRole.STUDENT,
        },
      });

      await expect(
        service.findOne(1, { userId: 7, role: UserRole.STUDENT }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow MANAGER with access to view student', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        id: 1,
        userId: 3,
        studentCode: 'SV001',
        user: { id: 3 },
      });
      repo.managerQueryHasAccessToStudent.mockResolvedValue(true);

      const result = await service.findOne(1, {
        userId: 2,
        role: UserRole.MANAGER,
      });

      expect(result).toBeDefined();
    });

    it('should reject MANAGER without access', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findById.mockResolvedValue({
        id: 1,
        userId: 3,
        studentCode: 'SV001',
        user: { id: 3 },
      });
      repo.managerQueryHasAccessToStudent.mockResolvedValue(false);

      await expect(
        service.findOne(1, { userId: 2, role: UserRole.MANAGER }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── UPDATE ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update a student successfully (ADMIN)', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findOne.mockResolvedValue({
        id: 1,
        userId: 10,
        studentCode: 'SV001',
        gender: 'Female',
        birthday: null,
        faculty: 'Old Faculty',
        className: 'Old Class',
        address: null,
        parentPhone: null,
      });

      const managerOverride = {
        getRepository: jest.fn((entity: any) => {
          if (entity.name === 'User') {
            return {
              findOne: jest.fn().mockResolvedValue({
                id: 10,
                status: UserStatus.ACTIVE,
                role: UserRole.STUDENT,
              }),
              save: jest.fn(async (v: any) => v),
            };
          }
          return {
            findOne: jest.fn().mockResolvedValue({
              id: 1,
              userId: 10,
              studentCode: 'SV001',
              faculty: 'Old Faculty',
            }),
            save: jest.fn(async (v: any) => v),
          };
        }),
      };

      repo.manager.transaction.mockImplementation(async (callback: any) =>
        callback(managerOverride),
      );

      const result = await service.update(
        1,
        { faculty: 'New Faculty', class_name: 'New Class' },
        { userId: 1, role: UserRole.ADMIN },
      );

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when updating non-existent student', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update(999, { faculty: 'New' } as any, {
          userId: 1,
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject STUDENT updating fields other than email/phone', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findOne.mockResolvedValue({
        id: 1,
        userId: 7,
        studentCode: 'SV001',
      });

      await expect(
        service.update(1, { faculty: 'New Faculty' } as any, {
          userId: 7,
          role: UserRole.STUDENT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow STUDENT to update their own email/phone', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findOne.mockResolvedValue({
        id: 1,
        userId: 7,
        studentCode: 'SV001',
      });

      const managerOverride = {
        getRepository: jest.fn((entity: any) => {
          if (entity.name === 'User') {
            return {
              findOne: jest.fn().mockResolvedValue({
                id: 7,
                status: UserStatus.ACTIVE,
                role: UserRole.STUDENT,
                email: 'old@test.com',
              }),
              save: jest.fn(async (v: any) => v),
            };
          }
          return {
            findOne: jest.fn().mockResolvedValue({
              id: 1,
              userId: 7,
              studentCode: 'SV001',
            }),
            save: jest.fn(async (v: any) => v),
          };
        }),
      };

      repo.manager.transaction.mockImplementation(async (callback: any) =>
        callback(managerOverride),
      );

      const result = await service.update(
        1,
        { email: 'new@test.com', phone: '0900000000' },
        { userId: 7, role: UserRole.STUDENT },
      );

      expect(result).toBeDefined();
    });

    it('should reject STUDENT updating another profile', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findOne.mockResolvedValue({
        id: 1,
        userId: 8,
        studentCode: 'SV001',
      });

      await expect(
        service.update(
          1,
          { email: 'test@test.com' },
          {
            userId: 7,
            role: UserRole.STUDENT,
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject duplicate student_code on update', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findOne.mockResolvedValue({
        id: 1,
        userId: 10,
        studentCode: 'SV001',
      });
      repo.findByStudentCode.mockResolvedValue({ id: 2 });

      await expect(
        service.update(
          1,
          { student_code: 'SV002' },
          {
            userId: 1,
            role: UserRole.ADMIN,
          },
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject duplicate user_id on update', async () => {
      const { service, repo, usersService } = createServiceWithMocks();
      repo.findOne.mockResolvedValue({
        id: 1,
        userId: 10,
        studentCode: 'SV001',
      });
      usersService.findOne.mockResolvedValue({
        id: 11,
        role: UserRole.STUDENT,
      });
      repo.findByUserId.mockResolvedValue({ id: 3 });

      await expect(
        service.update(
          1,
          { user_id: 11 },
          {
            userId: 1,
            role: UserRole.ADMIN,
          },
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject update when user_id references non-STUDENT user', async () => {
      const { service, repo, usersService } = createServiceWithMocks();
      repo.findOne.mockResolvedValue({
        id: 1,
        userId: 10,
        studentCode: 'SV001',
      });
      usersService.findOne.mockResolvedValue({
        id: 11,
        role: UserRole.ADMIN,
      });

      await expect(
        service.update(
          1,
          { user_id: 11 },
          {
            userId: 1,
            role: UserRole.ADMIN,
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── REMOVE ──────────────────────────────────────────────────────────────

  describe('remove / deactivate', () => {
    it('should deactivate student successfully when no constraints', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findOne.mockResolvedValue({
        id: 1,
        userId: 10,
        studentCode: 'SV001',
      });
      repo.hasActiveContractForStudent.mockResolvedValue(false);
      repo.hasPaymentForStudent.mockResolvedValue(false);
      repo.hasRoomChangeRequestForStudent.mockResolvedValue(false);
      repo.hasSupportRequestForStudent.mockResolvedValue(false);

      const result = await service.remove(1, {
        userId: 1,
        role: UserRole.ADMIN,
      });

      expect(result).toEqual({
        message: 'Student account disabled successfully',
      });
    });

    it('should reject remove when student has active contract', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findOne.mockResolvedValue({ id: 1, userId: 10 });
      repo.hasActiveContractForStudent.mockResolvedValue(true);

      await expect(
        service.remove(1, { userId: 1, role: UserRole.ADMIN }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject remove when student has payments', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findOne.mockResolvedValue({ id: 1, userId: 10 });
      repo.hasActiveContractForStudent.mockResolvedValue(false);
      repo.hasPaymentForStudent.mockResolvedValue(true);

      await expect(
        service.remove(1, { userId: 1, role: UserRole.ADMIN }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject remove when student has room change requests', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findOne.mockResolvedValue({ id: 1, userId: 10 });
      repo.hasActiveContractForStudent.mockResolvedValue(false);
      repo.hasPaymentForStudent.mockResolvedValue(false);
      repo.hasRoomChangeRequestForStudent.mockResolvedValue(true);

      await expect(
        service.remove(1, { userId: 1, role: UserRole.ADMIN }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject remove when student has support requests', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findOne.mockResolvedValue({ id: 1, userId: 10 });
      repo.hasActiveContractForStudent.mockResolvedValue(false);
      repo.hasPaymentForStudent.mockResolvedValue(false);
      repo.hasRoomChangeRequestForStudent.mockResolvedValue(false);
      repo.hasSupportRequestForStudent.mockResolvedValue(true);

      await expect(
        service.remove(1, { userId: 1, role: UserRole.ADMIN }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when removing non-existent student', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.remove(999, { userId: 1, role: UserRole.ADMIN }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-ADMIN tries to remove', async () => {
      const { service, repo } = createServiceWithMocks();
      repo.findOne.mockResolvedValue({ id: 1, userId: 10 });

      await expect(
        service.remove(1, { userId: 2, role: UserRole.MANAGER }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should deactivate user in transaction during remove', async () => {
      const { service, repo } = createServiceWithMocks();
      let userSaved = false;

      const managerOverride = {
        getRepository: jest.fn((entity: any) => {
          if (entity.name === 'User') {
            return {
              findOne: jest.fn().mockResolvedValue({
                id: 10,
                status: UserStatus.ACTIVE,
              }),
              save: jest.fn(async (user: any) => {
                userSaved = true;
                return { ...user, status: UserStatus.INACTIVE };
              }),
            };
          }
          return {
            findOne: jest.fn(),
            save: jest.fn(),
          };
        }),
      };

      repo.manager.transaction.mockImplementation(async (callback: any) =>
        callback(managerOverride),
      );

      repo.findOne.mockResolvedValue({ id: 1, userId: 10 });
      repo.hasActiveContractForStudent.mockResolvedValue(false);
      repo.hasPaymentForStudent.mockResolvedValue(false);
      repo.hasRoomChangeRequestForStudent.mockResolvedValue(false);
      repo.hasSupportRequestForStudent.mockResolvedValue(false);

      await service.remove(1, { userId: 1, role: UserRole.ADMIN });

      expect(repo.manager.transaction).toHaveBeenCalled();
    });
  });

  // ─── AUTHORIZATION EDGE CASES ───────────────────────────────────────────

  describe('authorization', () => {
    it('should allow ADMIN all access', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      repo.findById.mockResolvedValue({
        id: 1,
        userId: 3,
        studentCode: 'SV001',
        user: { id: 3 },
      });
      repo.findOne.mockResolvedValue({ id: 1, userId: 10 });
      repo.hasActiveContractForStudent.mockResolvedValue(false);
      repo.hasPaymentForStudent.mockResolvedValue(false);
      repo.hasRoomChangeRequestForStudent.mockResolvedValue(false);
      repo.hasSupportRequestForStudent.mockResolvedValue(false);

      await expect(
        service.findAll({}, { userId: 1, role: UserRole.ADMIN }),
      ).resolves.toBeDefined();
      await expect(
        service.findOne(1, { userId: 1, role: UserRole.ADMIN }),
      ).resolves.toBeDefined();
      await expect(
        service.remove(1, { userId: 1, role: UserRole.ADMIN }),
      ).resolves.toBeDefined();
    });

    it('should scope findAll for STUDENT', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({}, { userId: 7, role: UserRole.STUDENT });

      expect(qb.where).toHaveBeenCalled();
      expect(qb.leftJoin).not.toHaveBeenCalledWith(
        'building.manager',
        'buildingManager',
      );
    });

    it('should enforce MANAGER building scope', async () => {
      const { service, repo } = createServiceWithMocks();
      const qb = mockQueryBuilder();
      repo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({}, { userId: 2, role: UserRole.MANAGER });

      expect(qb.leftJoin).toHaveBeenCalledWith(
        'building.manager',
        'buildingManager',
      );
    });
  });
});
