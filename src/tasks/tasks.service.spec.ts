import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleKey } from '@prisma/client';
import { TasksService } from './tasks.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';

describe('TasksService (unit)', () => {
  let service: TasksService;

  const prisma = {
    project: { findUnique: jest.fn() },
    projectMember: { findUnique: jest.fn() },
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  const adminUser: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@test.com',
    fullName: 'Admin',
    role: RoleKey.ADMIN,
  };

  const memberUser: AuthenticatedUser = {
    id: 'member-1',
    email: 'member@test.com',
    fullName: 'Member',
    role: RoleKey.CORE_TEAM,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TasksService(prisma);
  });

  describe('create', () => {
    it('should create a task', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'p-1' });
      prisma.task.create.mockResolvedValue({ id: 't-1', title: 'Test Task' });

      const result = await service.create({
        title: '  Test Task  ',
        projectId: 'p-1',
        priority: 'HIGH',
      });

      expect(result.title).toBe('Test Task');
    });

    it('should throw NotFoundException when project not found', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          title: 'Test',
          projectId: 'missing',
          priority: 'MEDIUM',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should validate assignee is project member', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'p-1' });
      prisma.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          title: 'Test',
          projectId: 'p-1',
          priority: 'MEDIUM',
          assignedToId: 'non-member',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return all tasks for admin', async () => {
      prisma.task.findMany.mockResolvedValue([{ id: 't-1' }]);

      const result = await service.findAll(adminUser);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: undefined,
        }),
      );
      expect(result).toEqual([{ id: 't-1' }]);
    });

    it('should filter assigned tasks for team member', async () => {
      prisma.task.findMany.mockResolvedValue([]);

      await service.findAll(memberUser);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assignedToId: 'member-1' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return task for admin', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't-1',
        assignedToId: 'someone-else',
      });

      const result = await service.findOne('t-1', adminUser);

      expect(result.id).toBe('t-1');
    });

    it('should throw NotFoundException when task not found', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing', adminUser)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when non-admin views unassigned task', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't-1',
        assignedToId: 'someone-else',
      });

      await expect(service.findOne('t-1', memberUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should prevent non-admin from reassigning tasks', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't-1',
        assignedToId: 'member-1',
        projectId: 'p-1',
      });

      await expect(
        service.update('t-1', { assignedToId: 'other-user' }, memberUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should prevent non-admin from updating task title', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't-1',
        assignedToId: 'member-1',
        projectId: 'p-1',
      });

      await expect(
        service.update('t-1', { title: 'New Title' }, memberUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('findByUser', () => {
    it('should throw ForbiddenException when non-admin views another user tasks', async () => {
      await expect(
        service.findByUser('other-user', memberUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should allow user to view their own tasks', async () => {
      prisma.task.findMany.mockResolvedValue([{ id: 't-1' }]);

      const result = await service.findByUser('member-1', memberUser);

      expect(result).toEqual([{ id: 't-1' }]);
    });
  });
});
