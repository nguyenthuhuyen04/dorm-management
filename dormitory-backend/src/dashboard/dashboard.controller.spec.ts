import { NotFoundException } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { UserRole } from '../users/user.entity';

describe('DashboardController', () => {
  let controller: DashboardController;
  let dashboardService: { getDashboard: jest.Mock };

  beforeEach(() => {
    dashboardService = {
      getDashboard: jest.fn(),
    };

    controller = new DashboardController(dashboardService as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call DashboardService.getDashboard with user data', async () => {
    const user = { userId: 1, role: UserRole.ADMIN };
    dashboardService.getDashboard.mockResolvedValue({ users: { total: 1 } });

    const result = await controller.findAll({ user } as any);

    expect(dashboardService.getDashboard).toHaveBeenCalledWith(user);
    expect(result).toEqual({ users: { total: 1 } });
  });

  it('should propagate exceptions from DashboardService', async () => {
    const user = { userId: 2, role: UserRole.MANAGER };
    dashboardService.getDashboard.mockRejectedValue(new NotFoundException());

    await expect(controller.findAll({ user } as any)).rejects.toThrow(
      NotFoundException,
    );
  });
});
