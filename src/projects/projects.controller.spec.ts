import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { RoleKey } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockGuard = { canActivate: () => true };

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const mockProjectsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const adminUser: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@test.com',
    fullName: 'Admin',
    role: RoleKey.ADMIN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: ProjectsService, useValue: mockProjectsService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a project', async () => {
      const dto = { name: 'New Project', clientId: 'c-1' };
      const result = { id: 'p-1', ...dto };
      mockProjectsService.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual({ data: result });
      expect(mockProjectsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all projects', async () => {
      const result = [{ id: 'p-1' }, { id: 'p-2' }];
      mockProjectsService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(adminUser)).toEqual({ data: result });
      expect(mockProjectsService.findAll).toHaveBeenCalledWith(adminUser);
    });
  });

  describe('findOne', () => {
    it('should return a single project', async () => {
      const result = { id: 'p-1', name: 'Test' };
      mockProjectsService.findOne.mockResolvedValue(result);

      expect(await controller.findOne('p-1', adminUser)).toEqual({ data: result });
      expect(mockProjectsService.findOne).toHaveBeenCalledWith('p-1', adminUser);
    });
  });

  describe('update', () => {
    it('should update and return a project', async () => {
      const dto = { name: 'Updated Project' };
      const result = { id: 'p-1', ...dto };
      mockProjectsService.update.mockResolvedValue(result);

      expect(await controller.update('p-1', dto, adminUser)).toEqual({ data: result });
      expect(mockProjectsService.update).toHaveBeenCalledWith('p-1', dto, adminUser);
    });
  });
});
