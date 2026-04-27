import { Test, TestingModule } from '@nestjs/testing';
import { ProjectManagerController } from './project-manager.controller';
import { ProjectManagerService } from './project-manager.service';
import { TaskRevisionService } from './task-revision.service';
import { RoleKey } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockGuard = { canActivate: () => true };

describe('ProjectManagerController', () => {
  let controller: ProjectManagerController;

  const mockProjectManagerService = {
    getManagedProjects: jest.fn(),
    getManagedProject: jest.fn(),
    getProjectTeam: jest.fn(),
    addTeamMember: jest.fn(),
    removeTeamMember: jest.fn(),
    getProjectTasks: jest.fn(),
    getTask: jest.fn(),
    assignTask: jest.fn(),
    getAssignedTasks: jest.fn(),
  };

  const mockTaskRevisionService = {
    createRevision: jest.fn(),
    getTaskRevisions: jest.fn(),
    approveRevision: jest.fn(),
    rejectRevision: jest.fn(),
  };

  const teamMemberUser: AuthenticatedUser = {
    id: 'tm-1',
    email: 'manager@test.com',
    fullName: 'Project Manager',
    role: RoleKey.CORE_TEAM,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectManagerController],
      providers: [
        { provide: ProjectManagerService, useValue: mockProjectManagerService },
        { provide: TaskRevisionService, useValue: mockTaskRevisionService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ProjectManagerController>(ProjectManagerController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getManagedProjects', () => {
    it('should return managed projects', async () => {
      const mockProjects = [
        {
          id: 'p-1',
          name: 'Project 1',
          projectManagerId: 'tm-1',
        },
      ];

      mockProjectManagerService.getManagedProjects.mockResolvedValue(mockProjects);

      const response = await controller.getManagedProjects(teamMemberUser);

      expect(response).toEqual({ data: mockProjects });
      expect(mockProjectManagerService.getManagedProjects).toHaveBeenCalledWith(
        teamMemberUser,
      );
    });
  });

  describe('getProjectTeam', () => {
    it('should return team members for a project', async () => {
      const mockMembers = [
        {
          id: 'm-1',
          userId: 'u-1',
          user: { id: 'u-1', fullName: 'Developer', email: 'dev@test.com' },
        },
      ];

      mockProjectManagerService.getProjectTeam.mockResolvedValue(mockMembers);

      const response = await controller.getProjectTeam('p-1', teamMemberUser);

      expect(response).toEqual({ data: mockMembers });
    });
  });

  describe('addTeamMember', () => {
    it('should add a team member to project', async () => {
      const mockMember = {
        id: 'm-2',
        projectId: 'p-1',
        userId: 'u-2',
        user: { id: 'u-2', fullName: 'New Dev', email: 'newdev@test.com' },
      };

      mockProjectManagerService.addTeamMember.mockResolvedValue(mockMember);

      const response = await controller.addTeamMember(
        'p-1',
        { memberId: 'u-2' },
        teamMemberUser,
      );

      expect(response).toEqual({ data: mockMember });
      expect(mockProjectManagerService.addTeamMember).toHaveBeenCalledWith(
        'p-1',
        'u-2',
        teamMemberUser,
      );
    });
  });

  describe('getProjectTasks', () => {
    it('should return all tasks for a project', async () => {
      const mockTasks = [
        {
          id: 't-1',
          title: 'Task 1',
          projectId: 'p-1',
          status: 'TODO',
        },
      ];

      mockProjectManagerService.getProjectTasks.mockResolvedValue(mockTasks);

      const response = await controller.getProjectTasks('p-1', teamMemberUser);

      expect(response).toEqual({ data: mockTasks });
    });
  });

  describe('assignTask', () => {
    it('should assign a task to a team member', async () => {
      const mockTask = {
        id: 't-1',
        title: 'Task 1',
        projectId: 'p-1',
        assignedToId: 'u-2',
      };

      mockProjectManagerService.assignTask.mockResolvedValue(mockTask);

      const response = await controller.assignTask(
        'p-1',
        't-1',
        { memberId: 'u-2' },
        teamMemberUser,
      );

      expect(response).toEqual({ data: mockTask });
    });
  });

  describe('createRevision', () => {
    it('should create a task revision', async () => {
      const mockRevision = {
        id: 'rev-1',
        feedback: 'Needs improvement in UI',
        status: 'PENDING',
      };

      mockTaskRevisionService.createRevision.mockResolvedValue(mockRevision);

      const response = await controller.createRevision(
        'p-1',
        't-1',
        { feedback: 'Needs improvement in UI' },
        teamMemberUser,
      );

      expect(response).toEqual({ data: mockRevision });
    });
  });

  describe('getTaskRevisions', () => {
    it('should return revisions for a task', async () => {
      const mockRevisions = [
        {
          id: 'rev-1',
          feedback: 'Needs improvement',
          status: 'PENDING',
        },
      ];

      mockTaskRevisionService.getTaskRevisions.mockResolvedValue(mockRevisions);

      const response = await controller.getTaskRevisions('p-1', 't-1', teamMemberUser);

      expect(response).toEqual({ data: mockRevisions });
    });
  });

  describe('getAssignedTasks', () => {
    it('should return tasks assigned to current user', async () => {
      const mockTasks = [
        {
          id: 't-1',
          title: 'Task 1',
          assignedToId: 'tm-1',
          status: 'IN_PROGRESS',
        },
      ];

      mockProjectManagerService.getAssignedTasks.mockResolvedValue(mockTasks);

      const response = await controller.getAssignedTasks(teamMemberUser);

      expect(response).toEqual({ data: mockTasks });
    });
  });
});
