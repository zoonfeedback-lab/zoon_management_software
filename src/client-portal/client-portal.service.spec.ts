import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleKey } from '@prisma/client';
import { ClientPortalService } from './client-portal.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';

describe('ClientPortalService (unit)', () => {
  let service: ClientPortalService;

  const prisma = {
    client: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    project: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    projectApproval: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      groupBy: jest.fn(),
    },
    taskComment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    revisionRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    clientNotification: {
      create: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    clientFeedback: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    supportRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    deliverable: { findMany: jest.fn() },
  } as any;

  const clientUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'client@test.com',
    fullName: 'Client User',
    role: RoleKey.CLIENT,
  };

  const mockClient = {
    id: 'client-1',
    companyName: 'Test Co',
    contactPerson: 'John',
  };

  const nonClientUser: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@test.com',
    fullName: 'Admin',
    role: RoleKey.ADMIN,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClientPortalService(prisma);
    // Default: resolve client context
    prisma.client.findFirst.mockResolvedValue(mockClient);
  });

  // ─── CLIENT CONTEXT ───────────────────────────────────

  describe('getClientContext (via getProfile)', () => {
    it('should throw ForbiddenException for non-client role', async () => {
      await expect(service.getProfile(nonClientUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when no client profile linked', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(service.getProfile(clientUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  // ─── PROFILE ──────────────────────────────────────────

  describe('getProfile', () => {
    it('should return client profile with projects', async () => {
      prisma.client.findUnique.mockResolvedValue({
        ...mockClient,
        projects: [{ id: 'p-1', name: 'Website' }],
      });

      const result = await service.getProfile(clientUser);

      expect(result).toBeDefined();
      expect(prisma.client.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'client-1' } }),
      );
    });
  });

  describe('updateProfile', () => {
    it('should update profile fields', async () => {
      prisma.client.update.mockResolvedValue({ ...mockClient, companyName: 'Updated Co' });

      const result = await service.updateProfile(
        { companyName: '  Updated Co  ' },
        clientUser,
      );

      expect(result.companyName).toBe('Updated Co');
    });
  });

  // ─── PROJECTS ─────────────────────────────────────────

  describe('listProjects', () => {
    it('should return projects for client', async () => {
      prisma.project.findMany.mockResolvedValue([{ id: 'p-1' }]);

      const result = await service.listProjects(clientUser);

      expect(result).toEqual([{ id: 'p-1' }]);
    });
  });

  describe('getProject', () => {
    it('should return a specific project', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'p-1', clientId: 'client-1' });

      const result = await service.getProject('p-1', clientUser);

      expect(result.id).toBe('p-1');
    });

    it('should throw NotFoundException when project not found', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(service.getProject('missing', clientUser)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // ─── TASKS ────────────────────────────────────────────

  describe('getProjectTasks', () => {
    it('should return tasks for project', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'p-1', clientId: 'client-1' });
      prisma.task.findMany.mockResolvedValue([{ id: 't-1', title: 'Design' }]);

      const result = await service.getProjectTasks('p-1', clientUser);

      expect(result).toEqual([{ id: 't-1', title: 'Design' }]);
    });
  });

  // ─── NOTIFICATIONS ────────────────────────────────────

  describe('getNotifications', () => {
    it('should return notifications for client', async () => {
      prisma.clientNotification.findMany.mockResolvedValue([{ id: 'n-1' }]);

      const result = await service.getNotifications(clientUser);

      expect(result).toEqual([{ id: 'n-1' }]);
    });
  });

  describe('markNotificationRead', () => {
    it('should mark a notification as read', async () => {
      prisma.clientNotification.findFirst.mockResolvedValue({
        id: 'n-1',
        clientId: 'client-1',
      });
      prisma.clientNotification.update.mockResolvedValue({
        id: 'n-1',
        isRead: true,
      });

      const result = await service.markNotificationRead('n-1', clientUser);

      expect(result.isRead).toBe(true);
    });

    it('should throw NotFoundException when notification not found', async () => {
      prisma.clientNotification.findFirst.mockResolvedValue(null);

      await expect(
        service.markNotificationRead('missing', clientUser),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('markAllNotificationsRead', () => {
    it('should mark all notifications as read', async () => {
      prisma.clientNotification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllNotificationsRead(clientUser);

      expect(result).toEqual({ markedAsRead: 5 });
    });
  });

  // ─── REVISIONS ────────────────────────────────────────

  describe('createRevision', () => {
    it('should create a revision request', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'p-1', clientId: 'client-1' });
      prisma.revisionRequest.create.mockResolvedValue({ id: 'r-1' });
      prisma.clientNotification.create.mockResolvedValue({});

      const result = await service.createRevision(
        'p-1',
        { description: '  Please fix header  ' },
        clientUser,
      );

      expect(result.id).toBe('r-1');
    });
  });

  describe('getRevisions', () => {
    it('should return revisions for project', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'p-1', clientId: 'client-1' });
      prisma.revisionRequest.findMany.mockResolvedValue([{ id: 'r-1' }]);

      const result = await service.getRevisions('p-1', clientUser);

      expect(result).toEqual([{ id: 'r-1' }]);
    });
  });

  // ─── APPROVALS ────────────────────────────────────────

  describe('createApproval', () => {
    it('should create an approval', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'p-1', clientId: 'client-1' });
      prisma.projectApproval.create.mockResolvedValue({ id: 'a-1', status: 'APPROVED' });
      prisma.clientNotification.create.mockResolvedValue({});

      const result = await service.createApproval(
        'p-1',
        { status: 'APPROVED' as any, comment: 'Looks good' },
        clientUser,
      );

      expect(result.status).toBe('APPROVED');
    });
  });

  // ─── FEEDBACK ─────────────────────────────────────────

  describe('createFeedback', () => {
    it('should create feedback', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'p-1', clientId: 'client-1' });
      prisma.clientFeedback.create.mockResolvedValue({ id: 'f-1', rating: 5 });

      const result = await service.createFeedback(
        'p-1',
        { rating: 5, wouldRecommend: true },
        clientUser,
      );

      expect(result.rating).toBe(5);
    });
  });

  describe('getFeedback', () => {
    it('should return feedback for project', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'p-1', clientId: 'client-1' });
      prisma.clientFeedback.findFirst.mockResolvedValue({ id: 'f-1' });

      const result = await service.getFeedback('p-1', clientUser);

      expect(result.id).toBe('f-1');
    });
  });

  // ─── SUPPORT REQUESTS ─────────────────────────────────

  describe('getSupportRequests', () => {
    it('should return support requests for project', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'p-1', clientId: 'client-1' });
      prisma.supportRequest.findMany.mockResolvedValue([{ id: 's-1' }]);

      const result = await service.getSupportRequests('p-1', clientUser);

      expect(result).toEqual([{ id: 's-1' }]);
    });
  });

  describe('createSupportRequest', () => {
    it('should create a support request within window', async () => {
      const recentDate = new Date();
      prisma.project.findFirst.mockResolvedValue({
        id: 'p-1',
        clientId: 'client-1',
        updatedAt: recentDate,
      });
      prisma.supportRequest.create.mockResolvedValue({ id: 's-1' });

      const result = await service.createSupportRequest(
        'p-1',
        { description: '  Need help with deploy  ' },
        clientUser,
      );

      expect(result.id).toBe('s-1');
    });

    it('should throw ForbiddenException when support window expired', async () => {
      const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000); // 20 days ago
      prisma.project.findFirst.mockResolvedValue({
        id: 'p-1',
        clientId: 'client-1',
        updatedAt: oldDate,
      });

      await expect(
        service.createSupportRequest(
          'p-1',
          { description: 'Late request' },
          clientUser,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
