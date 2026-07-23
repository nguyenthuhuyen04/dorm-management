import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { UserRole } from '../users/user.entity';
import { Building } from './building.entity';
import { User } from '../users/user.entity';

describe('BuildingsService', () => {
  let service: BuildingsService;
  let buildingsRepository: any;
  let usersService: any;
  let dataSource: any;

  const mockUser = (userId: number, role: UserRole) => ({
    userId,
    role,
  });

  const mockBuilding = (overrides: Partial<Building> = {}): Building =>
    ({
      id: 1,
      buildingName: 'Tòa A',
      gender: 'Female',
      description: 'Ký túc xá nữ',
      createdAt: new Date('2026-07-23T00:00:00Z'),
      manager: {
        id: 2,
        username: 'manager1',
        fullName: 'Trần Văn Quản Lý',
        email: 'manager1@ktx.edu.vn',
        role: UserRole.MANAGER,
      } as any,
      rooms: [],
      ...overrides,
    }) as any;

  const mockTransactionManager = () => {
    const buildingRepo = {
      findOne: jest.fn(),
      create: jest.fn((data: any) => data),
      save: jest.fn(async (data: any) => ({ ...data, id: data.id ?? 123 })),
    };
    const userRepo = {
      findOne: jest.fn(),
    };

    const manager: any = {
      getRepository: jest.fn((entity: any) => {
        if (entity === Building || entity.name === 'Building') {
          return buildingRepo;
        }
        if (entity === User || entity.name === 'User') {
          return userRepo;
        }
        return {};
      }),
    };

    return { manager, buildingRepo, userRepo };
  };

  const setupService = () => {
    buildingsRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      countRooms: jest.fn(),
      delete: jest.fn(),
    };

    usersService = {
      findOne: jest.fn(),
    };

    const transactionContext = mockTransactionManager();
    dataSource = {
      transaction: jest.fn(async (callback: any) =>
        callback(transactionContext.manager),
      ),
    };

    service = new BuildingsService(
      buildingsRepository,
      usersService,
      dataSource as any,
    );

    return transactionContext;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupService();
  });

  describe('findAll', () => {
    it('should return paginated buildings for ADMIN with search and gender filters', async () => {
      const queryBuilder: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockBuilding()], 1]),
      };
      buildingsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll(
        { page: 2, limit: 5, search: 'Tòa', gender: 'Female' },
        mockUser(1, UserRole.ADMIN),
      );

      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'building.manager',
        'manager',
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'building.building_name LIKE :search',
        { search: '%Tòa%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'building.gender = :gender',
        { gender: 'Female' },
      );
      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(1);
      expect(result.data[0]?.buildingName).toBe('Tòa A');
    });

    it('should scope results for MANAGER by manager id', async () => {
      const queryBuilder: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      buildingsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.findAll({}, mockUser(2, UserRole.MANAGER));

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'building.manager_id = :managerId',
        { managerId: 2 },
      );
    });

    it('should default page and limit values when invalid', async () => {
      const queryBuilder: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      buildingsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll(
        { page: 0 as any, limit: -5 as any },
        mockUser(1, UserRole.ADMIN),
      );

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when building not found', async () => {
      const context = setupService();
      buildingsRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(
        service.findOne(999, mockUser(1, UserRole.ADMIN)),
      ).rejects.toThrow(NotFoundException);
      expect(buildingsRepository.findById).toHaveBeenCalledWith(999);
    });

    it('should deny access for manager not owning the building', async () => {
      const building = mockBuilding({
        manager: {
          id: 99,
          username: 'x',
          fullName: 'X',
          email: null,
          role: UserRole.MANAGER,
        } as any,
      });
      buildingsRepository.findById = jest.fn().mockResolvedValue(building);

      await expect(
        service.findOne(1, mockUser(2, UserRole.MANAGER)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return building for admin', async () => {
      buildingsRepository.findById = jest
        .fn()
        .mockResolvedValue(mockBuilding());

      const result = await service.findOne(1, mockUser(1, UserRole.ADMIN));

      expect(result?.buildingName).toBe('Tòa A');
      expect(result?.manager?.id).toBe(2);
    });
  });

  describe('create', () => {
    it('should create building successfully', async () => {
      const { buildingRepo, userRepo } = setupService();
      buildingRepo.findOne.mockResolvedValueOnce(null);
      userRepo.findOne.mockResolvedValueOnce({ id: 3, role: UserRole.MANAGER });
      buildingRepo.findOne.mockResolvedValueOnce(null);
      buildingRepo.save.mockResolvedValue({
        id: 123,
        buildingName: 'Tòa C',
        gender: 'Male',
        description: null,
        manager: {
          id: 3,
          username: 'new-manager',
          fullName: 'New Manager',
          email: null,
          role: UserRole.MANAGER,
        },
        createdAt: new Date(),
      });
      buildingRepo.findOne.mockResolvedValueOnce({
        id: 123,
        buildingName: 'Tòa C',
        gender: 'Male',
        description: null,
        manager: {
          id: 3,
          username: 'new-manager',
          fullName: 'New Manager',
          email: null,
          role: UserRole.MANAGER,
        },
        createdAt: new Date(),
      });

      const result = await service.create({
        building_name: 'Tòa C',
        gender: 'Male',
        manager_id: 3,
        description: null,
      } as any);

      expect(result?.buildingName).toBe('Tòa C');
      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 3 } });
      expect(buildingRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate building name', async () => {
      const { buildingRepo, userRepo } = setupService();
      buildingRepo.findOne.mockResolvedValueOnce({ id: 1 });

      await expect(
        service.create({
          building_name: 'Tòa A',
          gender: 'Female',
          manager_id: 3,
        } as any),
      ).rejects.toThrow(ConflictException);
      expect(buildingRepo.findOne).toHaveBeenCalledWith({
        where: { buildingName: 'Tòa A' },
      });
      expect(userRepo.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when manager does not exist', async () => {
      const { buildingRepo, userRepo } = setupService();
      buildingRepo.findOne.mockResolvedValueOnce(null);
      userRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.create({
          building_name: 'Tòa D',
          gender: 'Male',
          manager_id: 999,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when manager role is invalid', async () => {
      const { buildingRepo, userRepo } = setupService();
      buildingRepo.findOne.mockResolvedValueOnce(null);
      userRepo.findOne.mockResolvedValueOnce({ id: 4, role: UserRole.ADMIN });

      await expect(
        service.create({
          building_name: 'Tòa D',
          gender: 'Male',
          manager_id: 4,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when manager already manages another building', async () => {
      const { buildingRepo, userRepo } = setupService();
      buildingRepo.findOne.mockResolvedValueOnce(null);
      userRepo.findOne.mockResolvedValueOnce({ id: 3, role: UserRole.MANAGER });
      buildingRepo.findOne.mockResolvedValueOnce({ id: 99 });

      await expect(
        service.create({
          building_name: 'Tòa E',
          gender: 'Female',
          manager_id: 3,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when building not found', async () => {
      const { buildingRepo } = setupService();
      buildingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(999, { building_name: 'Tòa Z' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when building name exists on another record', async () => {
      const { buildingRepo } = setupService();
      buildingRepo.findOne.mockResolvedValueOnce(mockBuilding());
      buildingRepo.findOne.mockResolvedValueOnce({
        id: 2,
        buildingName: 'Tòa X',
      });

      await expect(
        service.update(1, { building_name: 'Tòa X' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when new manager does not exist', async () => {
      const { buildingRepo, userRepo } = setupService();
      buildingRepo.findOne.mockResolvedValueOnce(mockBuilding());
      userRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.update(1, { manager_id: 999 } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when new manager role is invalid', async () => {
      const { buildingRepo, userRepo } = setupService();
      buildingRepo.findOne.mockResolvedValueOnce(mockBuilding());
      userRepo.findOne.mockResolvedValueOnce({ id: 4, role: UserRole.ADMIN });

      await expect(service.update(1, { manager_id: 4 } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when manager already manages another building', async () => {
      const { buildingRepo, userRepo } = setupService();
      buildingRepo.findOne.mockResolvedValueOnce(mockBuilding());
      userRepo.findOne.mockResolvedValueOnce({ id: 4, role: UserRole.MANAGER });
      buildingRepo.findOne.mockResolvedValueOnce({
        id: 999,
        manager: { id: 4 },
      });

      await expect(service.update(1, { manager_id: 4 } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update building successfully', async () => {
      const { buildingRepo, userRepo } = setupService();
      const existing = mockBuilding();
      const updated = {
        ...existing,
        buildingName: 'Tòa New',
        gender: 'Male',
        description: 'Updated description',
        manager: {
          id: 4,
          username: 'm2',
          fullName: 'Manager Two',
          email: null,
          role: UserRole.MANAGER,
        },
      } as any;

      buildingRepo.findOne.mockImplementationOnce(
        async ({ where, relations }: any) => {
          if (where?.id === 1 && relations?.includes('manager')) {
            return existing;
          }
          return null;
        },
      );
      buildingRepo.findOne.mockResolvedValueOnce(null); // name conflict check
      userRepo.findOne.mockResolvedValueOnce({
        id: 4,
        role: UserRole.MANAGER,
        username: 'm2',
        fullName: 'Manager Two',
        email: null,
      });
      buildingRepo.findOne.mockResolvedValueOnce(null); // managedBuilding check
      buildingRepo.save.mockResolvedValue(updated);
      buildingRepo.findOne.mockResolvedValueOnce(updated);

      const result = await service.update(1, {
        building_name: 'Tòa New',
        gender: 'Male',
        manager_id: 4,
        description: 'Updated description',
      } as any);

      expect(result?.buildingName).toBe('Tòa New');
      expect(result?.gender).toBe('Male');
      expect(result?.description).toBe('Updated description');
      expect(result?.manager?.id).toBe(4);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when building not found', async () => {
      setupService();
      buildingsRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when building has rooms', async () => {
      setupService();
      buildingsRepository.findOne.mockResolvedValue(mockBuilding());
      buildingsRepository.countRooms.mockResolvedValue(2);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });

    it('should delete building successfully when no rooms exist', async () => {
      setupService();
      buildingsRepository.findOne.mockResolvedValue(mockBuilding());
      buildingsRepository.countRooms.mockResolvedValue(0);

      const result = await service.remove(1);

      expect(buildingsRepository.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: 'Building deleted successfully' });
    });
  });
});
