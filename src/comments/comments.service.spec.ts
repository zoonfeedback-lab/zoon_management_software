import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleKey } from '@prisma/client';
import { CommentsService } from './comments.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';

describe('CommentsService (unit)', () => {
  let service: CommentsService;

  const prisma = {
    task: { findUnique: jest.fn() },
    taskComment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    projectMember: { findUnique: jest.fn() },
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
    service = new CommentsService(prisma);
  });

  describe('create', () => {
    it('should create a comment when user is admin', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't-1',
        projectId: 'p-1',
        assignedToId: 'member-1',
      });
      prisma.projectMember.findUnique.mockResolvedValue(null); // admin doesn't need membership
      prisma.taskComment.create.mockResolvedValue({
        id: 'comment-1',
        content: 'Test comment',
      });

      const result = await service.create('t-1', { content: '  Test comment  ' }, adminUser);

      expect(result.id).toBe('comment-1');
    });

    it('should create a comment when user is project member', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't-1',
        projectId: 'p-1',
        assignedToId: 'member-1',
      });
      prisma.projectMember.findUnique.mockResolvedValue({ id: 'pm-1' });
      prisma.taskComment.create.mockResolvedValue({ id: 'comment-1' });

      await service.create('t-1', { content: 'Hello' }, memberUser);

      expect(prisma.taskComment.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when non-member non-admin tries to comment', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't-1',
        projectId: 'p-1',
        assignedToId: 'someone-else',
      });
      prisma.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        service.create('t-1', { content: 'Test' }, memberUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw NotFoundException when task not found', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(
        service.create('missing', { content: 'Test' }, adminUser),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findByTask', () => {
    it('should return comments for admin', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't-1',
        projectId: 'p-1',
        assignedToId: 'member-1',
      });
      prisma.projectMember.findUnique.mockResolvedValue(null);
      prisma.taskComment.findMany.mockResolvedValue([{ id: 'c-1' }]);

      const result = await service.findByTask('t-1', adminUser);

      expect(result).toEqual([{ id: 'c-1' }]);
    });

    it('should throw ForbiddenException for non-member', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't-1',
        projectId: 'p-1',
        assignedToId: 'someone-else',
      });
      prisma.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        service.findByTask('t-1', memberUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
