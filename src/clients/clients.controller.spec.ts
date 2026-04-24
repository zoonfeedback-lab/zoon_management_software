import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockGuard = { canActivate: () => true };

describe('ClientsController', () => {
  let controller: ClientsController;

  const mockClientsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        { provide: ClientsService, useValue: mockClientsService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();

    controller = module.get<ClientsController>(ClientsController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a client', async () => {
      const dto = {
        companyName: 'Zoon Labs',
        contactPerson: 'John',
        email: 'john@zoon.io',
      };
      const result = { id: 'c-1', ...dto };
      mockClientsService.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual({ data: result });
      expect(mockClientsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all clients', async () => {
      const result = [{ id: 'c-1' }, { id: 'c-2' }];
      mockClientsService.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toEqual({ data: result });
    });
  });

  describe('findOne', () => {
    it('should return a client by id', async () => {
      const result = { id: 'c-1', companyName: 'Test' };
      mockClientsService.findOne.mockResolvedValue(result);

      expect(await controller.findOne('c-1')).toEqual({ data: result });
      expect(mockClientsService.findOne).toHaveBeenCalledWith('c-1');
    });
  });

  describe('update', () => {
    it('should update and return a client', async () => {
      const dto = { companyName: 'Updated' };
      const result = { id: 'c-1', ...dto };
      mockClientsService.update.mockResolvedValue(result);

      expect(await controller.update('c-1', dto)).toEqual({ data: result });
      expect(mockClientsService.update).toHaveBeenCalledWith('c-1', dto);
    });
  });
});
