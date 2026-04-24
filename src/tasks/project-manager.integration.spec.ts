import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ProjectManagerController } from './project-manager.controller';
import { ProjectManagerService } from './project-manager.service';
import { TaskRevisionService } from './task-revision.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoleKey, RevisionStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

/**
 * Integration tests for the complete project manager workflow
 * Tests the flow: Project creation → PM assignment → Team management → Task assignment → Revisions
 */
describe('ProjectManager Workflow Integration Tests', () => {
  let app: INestApplication;
  let projectManagerService: ProjectManagerService;
  let taskRevisionService: TaskRevisionService;

  const mockGuard = { canActivate: () => true };

  const projectManagerUser: AuthenticatedUser = {
    id: 'pm-1',
    email: 'manager@test.com',
    fullName: 'John Manager',
    role: RoleKey.TEAM_MEMBER,
  };

  const teamMember1: AuthenticatedUser = {
    id: 'tm-1',
    email: 'developer1@test.com',
    fullName: 'Developer 1',
    role: RoleKey.TEAM_MEMBER,
  };

  const teamMember2: AuthenticatedUser = {
    id: 'tm-2',
    email: 'developer2@test.com',
    fullName: 'Developer 2',
    role: RoleKey.TEAM_MEMBER,
  };

  const mockPrismaService = {
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    projectMember: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    taskRevision: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectManagerController],
      providers: [
        ProjectManagerService,
        TaskRevisionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    projectManagerService = module.get<ProjectManagerService>(ProjectManagerService);
    taskRevisionService = module.get<TaskRevisionService>(TaskRevisionService);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Complete PM Workflow', () => {
    it('PM gets managed projects', async () => {
      const mockProjects = [
        {
          id: 'p-1',
          name: 'Website Project',
          projectManagerId: 'pm-1',
          client: { companyName: 'Acme Corp' },
          projectManager: projectManagerUser,
          members: [
            { userId: 'tm-1', user: teamMember1 },
            { userId: 'tm-2', user: teamMember2 },
          ],
          tasks: [],
        },
      ];

      mockPrismaService.project.findMany.mockResolvedValue(mockProjects);

      const result = await projectManagerService.getManagedProjects(projectManagerUser);

      expect(result).toHaveLength(1);
      expect(result[0].projectManagerId).toBe('pm-1');
      expect(result[0].members).toHaveLength(2);
    });

    it('PM can view specific project with all details', async () => {
      const mockProject = {
        id: 'p-1',
        name: 'Website Project',
        projectManagerId: 'pm-1',
        client: { companyName: 'Acme Corp' },
        projectManager: projectManagerUser,
        members: [
          { userId: 'tm-1', user: teamMember1 },
          { userId: 'tm-2', user: teamMember2 },
        ],
        tasks: [
          {
            id: 't-1',
            title: 'Homepage Design',
            status: 'IN_PROGRESS',
            assignedTo: teamMember1,
          },
        ],
      };

      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      const result = await projectManagerService.getManagedProject('p-1', projectManagerUser);

      expect(result.id).toBe('p-1');
      expect(result.tasks).toHaveLength(1);
      expect(result.members).toHaveLength(2);
    });

    it('PM can get team members for project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        projectManagerId: 'pm-1',
      });

      const mockMembers = [
        {
          id: 'm-1',
          userId: 'tm-1',
          user: teamMember1,
        },
        {
          id: 'm-2',
          userId: 'tm-2',
          user: teamMember2,
        },
      ];

      mockPrismaService.projectMember.findMany.mockResolvedValue(mockMembers);

      const result = await projectManagerService.getProjectTeam('p-1', projectManagerUser);

      expect(result).toHaveLength(2);
      expect(result[0].user.email).toBe('developer1@test.com');
    });

    it('PM can add new team member to project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        projectManagerId: 'pm-1',
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'tm-3',
        role: { key: RoleKey.TEAM_MEMBER },
      });

      mockPrismaService.projectMember.findUnique.mockResolvedValue(null);

      const mockNewMember = {
        id: 'm-3',
        projectId: 'p-1',
        userId: 'tm-3',
        user: {
          id: 'tm-3',
          fullName: 'Developer 3',
          email: 'developer3@test.com',
        },
      };

      mockPrismaService.projectMember.create.mockResolvedValue(mockNewMember);

      const result = await projectManagerService.addTeamMember('p-1', 'tm-3', projectManagerUser);

      expect(result.userId).toBe('tm-3');
      expect(mockPrismaService.projectMember.create).toHaveBeenCalled();
    });

    it('PM can assign task to team member', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        projectManagerId: 'pm-1',
      });

      mockPrismaService.projectMember.findUnique.mockResolvedValue({
        id: 'm-1',
      });

      mockPrismaService.task.findUnique.mockResolvedValue({
        projectId: 'p-1',
      });

      const mockAssignedTask = {
        id: 't-1',
        title: 'Homepage Design',
        projectId: 'p-1',
        assignedToId: 'tm-1',
        assignedTo: teamMember1,
      };

      mockPrismaService.task.update.mockResolvedValue(mockAssignedTask);

      const result = await projectManagerService.assignTask(
        't-1',
        'p-1',
        'tm-1',
        projectManagerUser,
      );

      expect(result.assignedToId).toBe('tm-1');
      expect(result.title).toBe('Homepage Design');
    });

    it('PM can create task revision with feedback', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        projectManagerId: 'pm-1',
      });

      mockPrismaService.task.findUnique.mockResolvedValue({
        projectId: 'p-1',
        status: 'DONE',
      });

      const mockRevision = {
        id: 'rev-1',
        feedback: 'Please adjust the button styling',
        taskId: 't-1',
        projectId: 'p-1',
        status: RevisionStatus.PENDING,
        createdById: 'pm-1',
        createdBy: projectManagerUser,
      };

      mockPrismaService.taskRevision.create.mockResolvedValue(mockRevision);

      const result = await taskRevisionService.createRevision(
        't-1',
        'p-1',
        { feedback: 'Please adjust the button styling' },
        projectManagerUser,
      );

      expect(result.status).toBe(RevisionStatus.PENDING);
      expect(result.feedback).toContain('button styling');
    });

    it('PM can view all revisions for a task', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        projectId: 'p-1',
        assignedToId: 'tm-1',
        project: { projectManagerId: 'pm-1' },
      });

      const mockRevisions = [
        {
          id: 'rev-1',
          feedback: 'First round feedback',
          status: RevisionStatus.PENDING,
          createdBy: projectManagerUser,
        },
        {
          id: 'rev-2',
          feedback: 'Second round feedback',
          status: RevisionStatus.APPROVED,
          createdBy: projectManagerUser,
        },
      ];

      mockPrismaService.taskRevision.findMany.mockResolvedValue(mockRevisions);

      const result = await taskRevisionService.getTaskRevisions('t-1', 'p-1', projectManagerUser);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(RevisionStatus.PENDING);
      expect(result[1].status).toBe(RevisionStatus.APPROVED);
    });

    it('PM can approve a revision', async () => {
      mockPrismaService.taskRevision.findUnique.mockResolvedValue({
        id: 'rev-1',
        projectId: 'p-1',
        status: RevisionStatus.PENDING,
        task: { projectId: 'p-1' },
      });

      mockPrismaService.project.findUnique.mockResolvedValue({
        projectManagerId: 'pm-1',
      });

      const mockApprovedRevision = {
        id: 'rev-1',
        status: RevisionStatus.APPROVED,
        createdBy: projectManagerUser,
      };

      mockPrismaService.taskRevision.update.mockResolvedValue(mockApprovedRevision);

      const result = await taskRevisionService.approveRevision('rev-1', 'p-1', projectManagerUser);

      expect(result.status).toBe(RevisionStatus.APPROVED);
    });

    it('Team member can view their assigned tasks', async () => {
      const mockAssignedTasks = [
        {
          id: 't-1',
          title: 'Homepage Design',
          assignedToId: 'tm-1',
          status: 'IN_PROGRESS',
          project: {
            name: 'Website Project',
            projectManager: projectManagerUser,
          },
        },
        {
          id: 't-2',
          title: 'Footer Component',
          assignedToId: 'tm-1',
          status: 'TODO',
          project: {
            name: 'Website Project',
            projectManager: projectManagerUser,
          },
        },
      ];

      mockPrismaService.task.findMany.mockResolvedValue(mockAssignedTasks);

      const result = await projectManagerService.getAssignedTasks(teamMember1);

      expect(result).toHaveLength(2);
      expect(result[0].assignedToId).toBe('tm-1');
      expect(result[1].status).toBe('TODO');
    });
  });
});
