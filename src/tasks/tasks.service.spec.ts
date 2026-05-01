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
    taskAttachment: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
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
    it('should create a task without attachments', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'p-1' });
      prisma.task.create.mockResolvedValue({ id: 't-1', title: 'Test Task', attachments: [] });

      const result = await service.create(
        {
          title: '  Test Task  ',
          projectId: 'p-1',
          priority: 'HIGH',
        },
        'admin-1',
      );

      expect(result.title).toBe('Test Task');
      expect(prisma.taskAttachment.createMany).not.toHaveBeenCalled();
    });

    it('should create a task with attachments', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'p-1' });
      const taskWithAttachments = {
        id: 't-1',
        title: 'Test Task',
        attachments: [
          { id: 'a-1', fileName: 'doc.pdf', fileUrl: 'https://example.com/doc.pdf' },
        ],
      };
      prisma.task.create.mockResolvedValue({ id: 't-1', title: 'Test Task', attachments: [] });
      prisma.taskAttachment.createMany.mockResolvedValue({ count: 1 });
      prisma.task.findUnique.mockResolvedValue(taskWithAttachments);

      const result = await service.create(
        {
          title: 'Test Task',
          projectId: 'p-1',
          priority: 'HIGH',
          attachments: [
            {
              fileName: 'doc.pdf',
              fileUrl: 'https://example.com/doc.pdf',
              fileType: 'application/pdf',
              fileSize: 1024,
            },
          ],
        },
        'admin-1',
      );

      expect(prisma.taskAttachment.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            fileName: 'doc.pdf',
            taskId: 't-1',
            uploadedById: 'admin-1',
          }),
        ],
      });
      expect(result!.attachments).toHaveLength(1);
    });

    it('should throw NotFoundException when project not found', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            title: 'Test',
            projectId: 'missing',
            priority: 'MEDIUM',
          },
          'admin-1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should validate assignee is project member', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'p-1' });
      prisma.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            title: 'Test',
            projectId: 'p-1',
            priority: 'MEDIUM',
            assignedToId: 'non-member',
          },
          'admin-1',
        ),
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

    it('should append new attachments on update', async () => {
      prisma.task.findUnique
        .mockResolvedValueOnce({
          id: 't-1',
          assignedToId: 'admin-1',
          projectId: 'p-1',
        })
        .mockResolvedValueOnce({
          id: 't-1',
          attachments: [{ id: 'a-1', fileName: 'new-doc.pdf' }],
        });
      prisma.task.update.mockResolvedValue({
        id: 't-1',
        attachments: [],
      });
      prisma.taskAttachment.createMany.mockResolvedValue({ count: 1 });

      const result = await service.update(
        't-1',
        {
          attachments: [
            {
              fileName: 'new-doc.pdf',
              fileUrl: 'https://example.com/new-doc.pdf',
            },
          ],
        },
        adminUser,
      );

      expect(prisma.taskAttachment.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            fileName: 'new-doc.pdf',
            taskId: 't-1',
            uploadedById: 'admin-1',
          }),
        ],
      });
    });
  });

  describe('deleteAttachment', () => {
    it('should allow admin to delete any attachment', async () => {
      prisma.taskAttachment.findUnique.mockResolvedValue({
        id: 'a-1',
        uploadedById: 'member-1',
        task: { projectId: 'p-1', project: { projectManagerId: 'pm-1' } },
      });
      prisma.taskAttachment.delete.mockResolvedValue({ id: 'a-1' });

      const result = await service.deleteAttachment('a-1', adminUser);

      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when attachment not found', async () => {
      prisma.taskAttachment.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteAttachment('missing', adminUser),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw ForbiddenException when unauthorized user tries to delete', async () => {
      prisma.taskAttachment.findUnique.mockResolvedValue({
        id: 'a-1',
        uploadedById: 'someone-else',
        task: { projectId: 'p-1', project: { projectManagerId: 'pm-1' } },
      });

      await expect(
        service.deleteAttachment('a-1', memberUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should allow uploader to delete their own attachment', async () => {
      prisma.taskAttachment.findUnique.mockResolvedValue({
        id: 'a-1',
        uploadedById: 'member-1',
        task: { projectId: 'p-1', project: { projectManagerId: 'pm-1' } },
      });
      prisma.taskAttachment.delete.mockResolvedValue({ id: 'a-1' });

      const result = await service.deleteAttachment('a-1', memberUser);

      expect(result).toEqual({ deleted: true });
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
