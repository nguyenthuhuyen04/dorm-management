import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { UserRole } from '../users/user.entity';

describe('BuildingsController', () => {
  let controller: BuildingsController;
  let buildingsService: any;

  const mockUser = (userId: number, role: UserRole) => ({
    userId,
    role,
  });

  beforeEach(async () => {
    buildingsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BuildingsController],
      providers: [
        {
          provide: BuildingsService,
          useValue: buildingsService,
        },
      ],
    }).compile();

    controller = module.get<BuildingsController>(BuildingsController);
  });

  describe('findAll', () => {
    it('should call service.findAll with parsed query params', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      buildingsService.findAll.mockResolvedValue({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        data: [],
      });

      const result = await controller.findAll(
        '2',
        '5',
        'Tòa',
        'Female',
        req as any,
      );

      expect(buildingsService.findAll).toHaveBeenCalledWith(
        {
          page: 2,
          limit: 5,
          search: 'Tòa',
          gender: 'Female',
        },
        req.user,
      );
      expect(result.total).toBe(1);
    });

    it('should use default pagination when query values are missing', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      buildingsService.findAll.mockResolvedValue({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        data: [],
      });

      await controller.findAll('', '', '', '', req as any);

      expect(buildingsService.findAll).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          search: '',
          gender: '',
        },
        req.user,
      );
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with parsed id and user', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };
      buildingsService.findOne.mockResolvedValue({ id: 1 });

      const result = await controller.findOne('1', req as any);

      expect(buildingsService.findOne).toHaveBeenCalledWith(1, req.user);
      expect(result?.id).toBe(1);
    });

    it('should throw BadRequestException for invalid id', async () => {
      const req = { user: mockUser(1, UserRole.ADMIN) };

      await expect(controller.findOne('abc', req as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('create', () => {
    it('should call service.create with DTO', async () => {
      const dto = {
        building_name: 'Tòa X',
        gender: 'Male',
        manager_id: 3,
        description: null,
      };
      buildingsService.create.mockResolvedValue({
        id: 1,
        buildingName: 'Tòa X',
      });

      const result = await controller.create(dto as any);

      expect(buildingsService.create).toHaveBeenCalledWith(dto);
      expect(result?.buildingName).toBe('Tòa X');
    });
  });

  describe('update', () => {
    it('should call service.update with parsed id and DTO', async () => {
      buildingsService.update.mockResolvedValue({ id: 1 });

      const result = await controller.update('1', {
        building_name: 'Tòa Y',
      } as any);

      expect(buildingsService.update).toHaveBeenCalledWith(1, {
        building_name: 'Tòa Y',
      });
      expect(result?.id).toBe(1);
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(
        controller.update('abc', { building_name: 'Tòa Y' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should call service.remove with parsed id', async () => {
      buildingsService.remove.mockResolvedValue({
        message: 'Building deleted successfully',
      });

      const result = await controller.remove('1');

      expect(buildingsService.remove).toHaveBeenCalledWith(1);
      expect(result.message).toBe('Building deleted successfully');
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(controller.remove('abc')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Roles decorator on endpoints', () => {
    it('GET /buildings should be accessible by ADMIN and MANAGER', () => {
      const roles = Reflect.getMetadata(
        'roles',
        BuildingsController.prototype.findAll,
      );
      expect(roles).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });

    it('GET /buildings/:id should be accessible by ADMIN and MANAGER', () => {
      const roles = Reflect.getMetadata(
        'roles',
        BuildingsController.prototype.findOne,
      );
      expect(roles).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });

    it('POST /buildings should be accessible by ADMIN only', () => {
      const roles = Reflect.getMetadata(
        'roles',
        BuildingsController.prototype.create,
      );
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('PUT /buildings/:id should be accessible by ADMIN only', () => {
      const roles = Reflect.getMetadata(
        'roles',
        BuildingsController.prototype.update,
      );
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('DELETE /buildings/:id should be accessible by ADMIN only', () => {
      const roles = Reflect.getMetadata(
        'roles',
        BuildingsController.prototype.remove,
      );
      expect(roles).toEqual([UserRole.ADMIN]);
    });
  });
});
