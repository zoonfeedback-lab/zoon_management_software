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

  const teamMemberUser: AuthenticatedUser = {
    id: 'tm-1',
    email: 'member@test.com',
    fullName: 'Team Member',
    role: RoleKey.TEAM_MEMBER,
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
    it('should create and return a project without project manager', async () => {
      const dto = { name: 'New Project', clientId: 'c-1' };
      const result = { id: 'p-1', ...dto, projectManagerId: null };
      mockProjectsService.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual({ data: result });
      expect(mockProjectsService.create).toHaveBeenCalledWith(dto);
    });

    it('should create and return a project with project manager', async () => {
      const dto = {
        name: 'New Project',
        clientId: 'c-1',
        projectManagerId: 'tm-1',
      };
      const result = {
        id: 'p-1',
        ...dto,
        projectManager: { id: 'tm-1', fullName: 'Team Member', email: 'member@test.com' },
      };
      mockProjectsService.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual({ data: result });
      expect(mockProjectsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('admin should see all projects', async () => {
      const result = [
        { id: 'p-1', name: 'Project 1', projectManagerId: null },
        { id: 'p-2', name: 'Project 2', projectManagerId: 'tm-1' },
      ];
      mockProjectsService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(adminUser)).toEqual({ data: result });
      expect(mockProjectsService.findAll).toHaveBeenCalledWith(adminUser);
    });

    it('team member should see only their assigned projects', async () => {
      const result = [
        { id: 'p-1', name: 'Assigned Project', members: [{ userId: 'tm-1' }] },
      ];
      mockProjectsService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(teamMemberUser)).toEqual({ data: result });
      expect(mockProjectsService.findAll).toHaveBeenCalledWith(teamMemberUser);
    });
  });

  describe('findOne', () => {
    it('should return a single project with project manager', async () => {
      const result = {
        id: 'p-1',
        name: 'Test',
        projectManagerId: 'tm-1',
        projectManager: { id: 'tm-1', fullName: 'Manager', email: 'manager@test.com' },
      };
      mockProjectsService.findOne.mockResolvedValue(result);

      expect(await controller.findOne('p-1', adminUser)).toEqual({ data: result });
      expect(mockProjectsService.findOne).toHaveBeenCalledWith('p-1', adminUser);
    });
  });

  describe('update', () => {
    it('should update project name', async () => {
      const dto = { name: 'Updated Project' };
      const result = { id: 'p-1', ...dto };
      mockProjectsService.update.mockResolvedValue(result);

      expect(await controller.update('p-1', dto, adminUser)).toEqual({ data: result });
      expect(mockProjectsService.update).toHaveBeenCalledWith('p-1', dto, adminUser);
    });

    it('should update project manager', async () => {
      const dto = { projectManagerId: 'tm-2' };
      const result = {
        id: 'p-1',
        name: 'Project',
        ...dto,
        projectManager: { id: 'tm-2', fullName: 'New Manager', email: 'newmanager@test.com' },
      };
      mockProjectsService.update.mockResolvedValue(result);

      expect(await controller.update('p-1', dto, adminUser)).toEqual({ data: result });
      expect(mockProjectsService.update).toHaveBeenCalledWith('p-1', dto, adminUser);
    });

    it('should update project status and team members', async () => {
      const dto = {
        status: 'ACTIVE',
        memberIds: ['tm-1', 'tm-2'],
      };
      const result = { id: 'p-1', ...dto };
      mockProjectsService.update.mockResolvedValue(result);

      expect(await controller.update('p-1', dto, adminUser)).toEqual({ data: result });
      expect(mockProjectsService.update).toHaveBeenCalledWith('p-1', dto, adminUser);
    });
  });
});
