import { BadRequestException } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { UserRole } from '../users/user.entity';

describe('RoomsController', () => {
  let controller: RoomsController;
  let service: any;

  beforeEach(() => {
    service = {
      findAll: jest.fn().mockResolvedValue({ data: [] }),
      findOne: jest.fn().mockResolvedValue({ id: 1 }),
      create: jest.fn().mockResolvedValue({ id: 2 }),
      update: jest.fn().mockResolvedValue({ id: 3 }),
      remove: jest
        .fn()
        .mockResolvedValue({ message: 'Room deleted successfully' }),
    };

    controller = new RoomsController(service);
  });

  it('forwards query and user to service.findAll with parsed values', async () => {
    const req = { user: { userId: 7, role: UserRole.ADMIN } };

    await controller.findAll(
      req,
      '2',
      '5',
      'abc',
      '10',
      'ACTIVE',
      'Male',
      '3',
      'Single',
    );

    expect(service.findAll).toHaveBeenCalledWith(
      {
        page: 2,
        limit: 5,
        search: 'abc',
        buildingId: 10,
        status: 'ACTIVE',
        gender: 'Male',
        floor: 3,
        roomType: 'Single',
      },
      req.user,
    );
  });

  it('uses defaults for missing query values in findAll', async () => {
    const req = { user: { userId: 7, role: UserRole.ADMIN } };

    await controller.findAll(
      req,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    expect(service.findAll).toHaveBeenCalledWith(
      {
        page: 1,
        limit: 10,
        search: undefined,
        buildingId: undefined,
        status: undefined,
        gender: undefined,
        floor: undefined,
        roomType: undefined,
      },
      req.user,
    );
  });

  it('throws BadRequestException for invalid findOne id', async () => {
    await expect(
      controller.findOne('abc', { user: { userId: 1, role: UserRole.ADMIN } }),
    ).rejects.toThrow(BadRequestException);
  });

  it('calls service.create for POST', async () => {
    const dto = {
      building_id: 1,
      room_number: '101',
      floor: 1,
      capacity: 2,
      room_fee: 100000,
    };
    const req = { user: { userId: 7, role: UserRole.ADMIN } };

    const result = await controller.create(dto as any, req as any);

    expect(service.create).toHaveBeenCalledWith(dto, req.user);
    expect(result).toEqual({ id: 2 });
  });

  it('throws BadRequestException for invalid update id', async () => {
    await expect(
      controller.update('abc', { room_fee: 1000 } as any, {
        user: { userId: 1, role: UserRole.ADMIN },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('calls service.update for valid id', async () => {
    const dto = { room_fee: 2000 };
    const req = { user: { userId: 7, role: UserRole.ADMIN } };

    const result = await controller.update('5', dto as any, req as any);

    expect(service.update).toHaveBeenCalledWith(5, dto, req.user);
    expect(result).toEqual({ id: 3 });
  });

  it('throws BadRequestException for invalid remove id', async () => {
    await expect(
      controller.remove('invalid', {
        user: { userId: 1, role: UserRole.ADMIN },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('calls service.remove for valid id', async () => {
    const req = { user: { userId: 7, role: UserRole.ADMIN } };
    const result = await controller.remove('6', req as any);

    expect(service.remove).toHaveBeenCalledWith(6, req.user);
    expect(result).toEqual({ message: 'Room deleted successfully' });
  });
});
