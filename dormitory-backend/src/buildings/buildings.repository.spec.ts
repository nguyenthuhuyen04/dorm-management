import { DataSource } from 'typeorm';
import { BuildingsRepository } from './buildings.repository';
import { Room } from '../rooms/room.entity';

describe('BuildingsRepository', () => {
  let repository: BuildingsRepository;
  let mockManager: any;
  let dataSource: any;

  beforeEach(async () => {
    mockManager = {
      count: jest.fn(),
    };

    dataSource = {
      createEntityManager: jest.fn().mockReturnValue(mockManager),
    };

    repository = new BuildingsRepository(dataSource as any);
    Object.defineProperty(repository, 'manager', {
      value: mockManager,
      writable: true,
    });

    (repository as any).findOne = jest.fn();
  });

  describe('findById', () => {
    it('should find a building by id with manager relation', async () => {
      const expected = { id: 1, buildingName: 'Tòa A', manager: { id: 2 } };
      (repository as any).findOne.mockResolvedValue(expected);

      const result = await repository.findById(1);

      expect((repository as any).findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['manager'],
      });
      expect(result).toEqual(expected);
    });

    it('should return null when building is not found', async () => {
      (repository as any).findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('countRooms', () => {
    it('should count rooms by building id', async () => {
      mockManager.count.mockResolvedValue(3);

      const result = await repository.countRooms(1);

      expect(mockManager.count).toHaveBeenCalledWith(Room, {
        where: { buildingId: 1 },
      });
      expect(result).toBe(3);
    });
  });
});
