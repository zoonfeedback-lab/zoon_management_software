import { Test, TestingModule } from '@nestjs/testing';
import { TaskRevisionService } from './task-revision.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoleKey, RevisionStatus } from '@prisma/client';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';

describe('TaskRevisionService', () => {
  let service: TaskRevisionService;
  let prisma: PrismaService;

  const projectManagerUser: AuthenticatedUser = {
    id: 'pm-1',
    email: 'manager@test.com',
    fullName: 'Project Manager',
    role: RoleKey.TEAM_MEMBER,
  };

  const teamMemberUser: AuthenticatedUser = {
    id: 'tm-1',
    email: 'developer@test.com',
    fullName: 'Developer',
    role: RoleKey.TEAM_MEMBER,
  };

  const mockPrismaService = {
    project: {
      findUnique: jest.fn(),
    },
    task: {
      findUnique: jest.fn(),
    },
    taskRevision: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskRevisionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TaskRevisionService>(TaskRevisionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRevision', () => {
    it('should create a new revision', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        projectManagerId: 'pm-1',
      });

      mockPrismaService.task.findUnique.mockResolvedValue({
        projectId: 'p-1',
        status: 'DONE',
      });

      const mockRevision = {
        id: 'rev-1',
        feedback: 'Needs improvement in the header section',
        taskId: 't-1',
        projectId: 'p-1',
        createdById: 'pm-1',
        status: RevisionStatus.PENDING,
        createdBy: { id: 'pm-1', fullName: 'Project Manager' },
        task: { id: 't-1', title: 'Task 1', status: 'DONE' },
      };

      mockPrismaService.taskRevision.create.mockResolvedValue(mockRevision);

      const result = await service.createRevision(
        't-1',
        'p-1',
        { feedback: 'Needs improvement in the header section' },
        projectManagerUser,
      );

      expect(result).toEqual(mockRevision);
      expect(mockPrismaService.taskRevision.create).toHaveBeenCalled();
    });

    it('should throw error if user is not project manager', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        projectManagerId: 'other-pm',
      });

      await expect(
        service.createRevision(
          't-1',
          'p-1',
          { feedback: 'Needs improvement' },
          projectManagerUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw error if task not found', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        projectManagerId: 'pm-1',
      });

      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(
        service.createRevision(
          't-1',
          'p-1',
          { feedback: 'Needs improvement' },
          projectManagerUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTaskRevisions', () => {
    it('should return all revisions for a task', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        projectId: 'p-1',
        assignedToId: 'tm-1',
        project: { projectManagerId: 'pm-1' },
      });

      const mockRevisions = [
        {
          id: 'rev-1',
          feedback: 'Needs improvement',
          status: RevisionStatus.PENDING,
          createdBy: { id: 'pm-1', fullName: 'Project Manager' },
        },
      ];

      mockPrismaService.taskRevision.findMany.mockResolvedValue(mockRevisions);

      const result = await service.getTaskRevisions('t-1', 'p-1', teamMemberUser);

      expect(result).toEqual(mockRevisions);
    });
  });

  describe('approveRevision', () => {
    it('should approve a revision', async () => {
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
        createdBy: { id: 'pm-1', fullName: 'Project Manager' },
      };

      mockPrismaService.taskRevision.update.mockResolvedValue(mockApprovedRevision);

      const result = await service.approveRevision('rev-1', 'p-1', projectManagerUser);

      expect(result).toEqual(mockApprovedRevision);
      expect(mockPrismaService.taskRevision.update).toHaveBeenCalledWith({
        where: { id: 'rev-1' },
        data: { status: RevisionStatus.APPROVED },
        include: {
          createdBy: {
            select: { id: true, fullName: true },
          },
        },
      });
    });

    it('should throw error if user is not project manager', async () => {
      mockPrismaService.taskRevision.findUnique.mockResolvedValue({
        id: 'rev-1',
        projectId: 'p-1',
        task: { projectId: 'p-1' },
      });

      mockPrismaService.project.findUnique.mockResolvedValue({
        projectManagerId: 'other-pm',
      });

      await expect(service.approveRevision('rev-1', 'p-1', projectManagerUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
