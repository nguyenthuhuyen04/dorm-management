import { RegulationsRepository } from './regulations.repository';

describe('RegulationsRepository', () => {
  let repository: RegulationsRepository;
  let dataSource: any;

  const mockRepositoryMethods = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockManager = {
    getRepository: jest.fn().mockReturnValue(mockRepositoryMethods),
    query: jest.fn(),
    transaction: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn().mockReturnValue(mockManager),
    };

    repository = new RegulationsRepository(dataSource as any);
    Object.defineProperty(repository, 'manager', {
      value: mockManager,
      writable: true,
    });
    (repository as any).findOne = mockRepositoryMethods.findOne;
    (repository as any).find = mockRepositoryMethods.find;
    (repository as any).count = mockRepositoryMethods.count;
    (repository as any).createQueryBuilder =
      mockRepositoryMethods.createQueryBuilder;

    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find a regulation by id with relations', async () => {
      const mockRegulation = {
        id: 1,
        title: 'Test Regulation',
        creator: { id: 2, fullName: 'Admin' },
      };
      mockRepositoryMethods.findOne.mockResolvedValue(mockRegulation);

      const result = await repository.findById(1);

      expect(mockRepositoryMethods.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['creator'],
      });
      expect(result).toEqual(mockRegulation);
    });

    it('should return null when regulation not found', async () => {
      mockRepositoryMethods.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });
});
