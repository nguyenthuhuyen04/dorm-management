import { DataSource } from 'typeorm';
import { RoomsRepository } from './rooms.repository';
import { Room } from './room.entity';
import { ContractStatus } from '../common/enums/user-role.enum';

describe('RoomsRepository', () => {
  let repository: RoomsRepository;
  let dataSource: any;

  beforeEach(() => {
    dataSource = {
      createEntityManager: jest.fn().mockReturnValue({ query: jest.fn() }),
    };
    repository = new RoomsRepository(dataSource as DataSource);
  });

  it('returns room by id with relations', async () => {
    const findOneSpy = jest.spyOn(repository, 'findOne');
    repository.findOne = jest.fn().mockResolvedValue({ id: 1 } as Room);

    const result = await repository.findById(1);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      relations: [
        'building',
        'building.manager',
        'contracts',
        'contracts.student',
      ],
    });
    expect(result).toEqual({ id: 1 });
  });

  it('returns room by building and room number', async () => {
    repository.findOne = jest.fn().mockResolvedValue({ id: 2 } as Room);

    const result = await repository.findByBuildingAndRoomNumber(3, 'A101');

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { buildingId: 3, roomNumber: 'A101' },
    });
    expect(result).toEqual({ id: 2 });
  });

  it('counts active occupancy from query result', async () => {
    const querySpy = repository.manager.query as jest.Mock;
    querySpy.mockResolvedValue([{ count: '5' }]);

    const result = await repository.getActiveOccupancy(10);

    expect(repository.manager.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS count FROM contracts WHERE room_id = ? AND status = ?',
      [10, ContractStatus.ACTIVE],
    );
    expect(result).toBe(5);
  });

  it('counts active contracts from query result', async () => {
    const querySpy = repository.manager.query as jest.Mock;
    querySpy.mockResolvedValue([{ count: '2' }]);

    const result = await repository.countActiveContracts(15);

    expect(repository.manager.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS count FROM contracts WHERE room_id = ? AND status = ?',
      [15, ContractStatus.ACTIVE],
    );
    expect(result).toBe(2);
  });

  it('counts contracts from query result', async () => {
    const querySpy = repository.manager.query as jest.Mock;
    querySpy.mockResolvedValue([{ count: '7' }]);

    const result = await repository.countContracts(20);

    expect(repository.manager.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS count FROM contracts WHERE room_id = ?',
      [20],
    );
    expect(result).toBe(7);
  });

  it('checks student access to room using SQL exists', async () => {
    const querySpy = repository.manager.query as jest.Mock;
    querySpy.mockResolvedValue([{ has_access: '1' }]);

    const result = await repository.hasStudentAccessToRoom(5, 12);

    expect(repository.manager.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT EXISTS'),
      [5, ContractStatus.ACTIVE, 12],
    );
    expect(result).toBe(true);
  });
});
