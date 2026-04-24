import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { RoleKey } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockGuard = { canActivate: () => true };

describe('TasksController', () => {
  let controller: TasksController;

  const mockTasksService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    findByProject: jest.fn(),
    findByUser: jest.fn(),
  };

  const adminUser: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@test.com',
    fullName: 'Admin',
    role: RoleKey.ADMIN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: TasksService, useValue: mockTasksService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();

    controller = module.get<TasksController>(TasksController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a task', async () => {
      const dto = { title: 'New Task', projectId: 'p-1', priority: 'HIGH' };
      const result = { id: 't-1', ...dto };
      mockTasksService.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual({ data: result });
      expect(mockTasksService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all tasks', async () => {
      const result = [{ id: 't-1' }];
      mockTasksService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(adminUser)).toEqual({ data: result });
      expect(mockTasksService.findAll).toHaveBeenCalledWith(adminUser);
    });
  });

  describe('findOne', () => {
    it('should return a task by id', async () => {
      const result = { id: 't-1', title: 'Test' };
      mockTasksService.findOne.mockResolvedValue(result);

      expect(await controller.findOne('t-1', adminUser)).toEqual({ data: result });
      expect(mockTasksService.findOne).toHaveBeenCalledWith('t-1', adminUser);
    });
  });

  describe('update', () => {
    it('should update and return a task', async () => {
      const dto = { title: 'Updated Task' };
      const result = { id: 't-1', ...dto };
      mockTasksService.update.mockResolvedValue(result);

      expect(await controller.update('t-1', dto, adminUser)).toEqual({ data: result });
      expect(mockTasksService.update).toHaveBeenCalledWith('t-1', dto, adminUser);
    });
  });

  describe('findByProject', () => {
    it('should return tasks for a project', async () => {
      const result = [{ id: 't-1' }];
      mockTasksService.findByProject.mockResolvedValue(result);

      expect(await controller.findByProject('p-1', adminUser)).toEqual({ data: result });
      expect(mockTasksService.findByProject).toHaveBeenCalledWith('p-1', adminUser);
    });
  });

  describe('findByUser', () => {
    it('should return tasks for a user', async () => {
      const result = [{ id: 't-1' }];
      mockTasksService.findByUser.mockResolvedValue(result);

      expect(await controller.findByUser('u-1', adminUser)).toEqual({ data: result });
      expect(mockTasksService.findByUser).toHaveBeenCalledWith('u-1', adminUser);
    });
  });
});
