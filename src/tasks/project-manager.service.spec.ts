import { Test, TestingModule } from '@nestjs/testing';
import { ProjectManagerService } from './project-manager.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoleKey } from '@prisma/client';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';

describe('ProjectManagerService', () => {
  let service: ProjectManagerService;
  let prisma: PrismaService;

  const teamMemberUser: AuthenticatedUser = {
    id: 'tm-1',
    email: 'manager@test.com',
    fullName: 'John Manager',
    role: RoleKey.TEAM_MEMBER,
  };

  const mockPrismaService = {
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
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
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectManagerService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProjectManagerService>(ProjectManagerService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getManagedProjects', () => {
    it('should return projects managed by the user', async () => {
      const mockProjects = [
        {
          id: 'p-1',
          name: 'Project 1',
          projectManagerId: 'tm-1',
          status: 'ACTIVE',
        },
      ];

      mockPrismaService.project.findMany.mockResolvedValue(mockProjects);

      const result = await service.getManagedProjects(teamMemberUser);

      expect(result).toEqual(mockProjects);
      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectManagerId: 'tm-1',
            isActive: true,
          },
        }),
      );
    });

    it('should throw error if user is not a team member', async () => {
      const adminUser: AuthenticatedUser = {
        id: 'admin-1',
        email: 'admin@test.com',
        fullName: 'Admin',
        role: RoleKey.ADMIN,
      };

      await expect(service.getManagedProjects(adminUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getProjectTeam', () => {
    it('should return team members for a project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        projectManagerId: 'tm-1',
      });

      const mockMembers = [
        {
          id: 'm-1',
          userId: 'u-1',
          projectId: 'p-1',
          user: { id: 'u-1', fullName: 'Developer', email: 'dev@test.com' },
        },
      ];

      mockPrismaService.projectMember.findMany.mockResolvedValue(mockMembers);

      const result = await service.getProjectTeam('p-1', teamMemberUser);

      expect(result).toEqual(mockMembers);
    });

    it('should throw error if user is not project manager', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        projectManagerId: 'other-manager-id',
      });

      await expect(service.getProjectTeam('p-1', teamMemberUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('addTeamMember', () => {
    it('should add a team member to the project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        projectManagerId: 'tm-1',
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u-2',
        role: { key: RoleKey.TEAM_MEMBER },
      });

      mockPrismaService.projectMember.findUnique.mockResolvedValue(null);

      const mockCreatedMember = {
        id: 'm-2',
        projectId: 'p-1',
        userId: 'u-2',
        user: { id: 'u-2', fullName: 'New Member', email: 'new@test.com' },
      };

      mockPrismaService.projectMember.create.mockResolvedValue(mockCreatedMember);

      const result = await service.addTeamMember('p-1', 'u-2', teamMemberUser);

      expect(result).toEqual(mockCreatedMember);
      expect(mockPrismaService.projectMember.create).toHaveBeenCalled();
    });

    it('should throw error if user is already a member', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        projectManagerId: 'tm-1',
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u-2',
        role: { key: RoleKey.TEAM_MEMBER },
      });

      mockPrismaService.projectMember.findUnique.mockResolvedValue({
        id: 'm-1',
      });

      await expect(service.addTeamMember('p-1', 'u-2', teamMemberUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('assignTask', () => {
    it('should assign a task to a team member', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        projectManagerId: 'tm-1',
      });

      mockPrismaService.projectMember.findUnique.mockResolvedValue({
        id: 'm-1',
      });

      mockPrismaService.task.findUnique
        .mockResolvedValueOnce({ projectId: 'p-1' })
        .mockResolvedValueOnce({
          id: 't-1',
          projectId: 'p-1',
          assignedToId: 'u-2',
        });

      const result = await service.assignTask('t-1', 'p-1', 'u-2', teamMemberUser);

      expect(result).toBeDefined();
      expect(mockPrismaService.task.update).toHaveBeenCalled();
    });
  });
});
