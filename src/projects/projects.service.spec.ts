import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RoleKey } from '@prisma/client';
import { ProjectsService } from './projects.service';

describe('ProjectsService (unit)', () => {
  let service: ProjectsService;

  const prisma = {
    client: { findUnique: jest.fn() },
    user: { count: jest.fn(), findUnique: jest.fn() },
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectsService(prisma);
  });

  describe('create', () => {
    it('rejects create when startDate is after deadline', async () => {
      await expect(
        service.create({
          name: 'Website Revamp',
          clientId: 'client-1',
          startDate: '2026-10-10',
          deadline: '2026-10-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deduplicates memberIds before create', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'client-1' });
      prisma.user.count.mockResolvedValue(2);
      prisma.project.create.mockResolvedValue({ id: 'project-1' });

      await service.create({
        name: 'Website Revamp',
        clientId: 'client-1',
        memberIds: ['u-1', 'u-1', 'u-2'],
      });

      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { id: { in: ['u-1', 'u-2'] }, isActive: true },
      });
      expect(prisma.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            members: {
              create: [{ userId: 'u-1' }, { userId: 'u-2' }],
            },
          }),
        }),
      );
    });

    it('throws not found when client does not exist', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          name: 'Website Revamp',
          clientId: 'missing-client',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates project with project manager when provided', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'client-1' });
      prisma.user.findUnique.mockResolvedValue({
        id: 'pm-1',
        role: { key: RoleKey.TEAM_MEMBER },
        isActive: true,
      });
      prisma.user.count.mockResolvedValue(0);
      prisma.project.create.mockResolvedValue({
        id: 'project-1',
        projectManagerId: 'pm-1',
      });

      await service.create({
        name: 'Website Revamp',
        clientId: 'client-1',
        projectManagerId: 'pm-1',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'pm-1' },
        select: { id: true, role: { select: { key: true } }, isActive: true },
      });
      expect(prisma.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectManagerId: 'pm-1',
          }),
        }),
      );
    });

    it('rejects project manager if not a team member', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'client-1' });
      prisma.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        role: { key: RoleKey.ADMIN },
        isActive: true,
      });

      await expect(
        service.create({
          name: 'Website Revamp',
          clientId: 'client-1',
          projectManagerId: 'admin-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('admin sees all projects', async () => {
      prisma.project.findMany.mockResolvedValue([]);
      await service.findAll({
        id: 'admin-1',
        email: 'admin@test.com',
        fullName: 'Admin',
        role: RoleKey.ADMIN,
      });

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: undefined,
        }),
      );
    });

    it('team member sees only assigned projects', async () => {
      prisma.project.findMany.mockResolvedValue([]);
      await service.findAll({
        id: 'u-1',
        email: 'user@test.com',
        fullName: 'User',
        role: RoleKey.TEAM_MEMBER,
      });

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { members: { some: { userId: 'u-1' } } },
        }),
      );
    });
  });

  describe('update', () => {
    it('updates project with new project manager', async () => {
      prisma.project.findUnique.mockResolvedValue({
        id: 'p-1',
        projectManagerId: 'old-pm',
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'new-pm',
        role: { key: RoleKey.TEAM_MEMBER },
        isActive: true,
      });
      prisma.project.update.mockResolvedValue({ id: 'p-1', projectManagerId: 'new-pm' });

      await service.update('p-1', { projectManagerId: 'new-pm' }, {
        id: 'admin-1',
        email: 'admin@test.com',
        fullName: 'Admin',
        role: RoleKey.ADMIN,
      });

      expect(prisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectManagerId: 'new-pm',
          }),
        }),
      );
    });
  });
});
