import { Test, TestingModule } from '@nestjs/testing';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';
import { RoleKey } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockGuard = { canActivate: () => true };

describe('ClientPortalController', () => {
  let controller: ClientPortalController;

  const mockService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    getDashboard: jest.fn(),
    listProjects: jest.fn(),
    getProject: jest.fn(),
    getProjectTasks: jest.fn(),
    createTaskComment: jest.fn(),
    getTaskComments: jest.fn(),
    createRevision: jest.fn(),
    getRevisions: jest.fn(),
    createApproval: jest.fn(),
    getApprovals: jest.fn(),
    getDeliverables: jest.fn(),
    getNotifications: jest.fn(),
    markNotificationRead: jest.fn(),
    markAllNotificationsRead: jest.fn(),
    createFeedback: jest.fn(),
    getFeedback: jest.fn(),
    createSupportRequest: jest.fn(),
    getSupportRequests: jest.fn(),
  };

  const clientUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'client@test.com',
    fullName: 'Client',
    role: RoleKey.CLIENT,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientPortalController],
      providers: [
        { provide: ClientPortalService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();

    controller = module.get<ClientPortalController>(ClientPortalController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── PROFILE ──────────────────────────────────────────

  describe('getProfile', () => {
    it('should return profile data', async () => {
      const result = { id: 'c-1', companyName: 'Test' };
      mockService.getProfile.mockResolvedValue(result);

      expect(await controller.getProfile(clientUser)).toEqual({ data: result });
    });
  });

  describe('updateProfile', () => {
    it('should update and return profile', async () => {
      const dto = { companyName: 'Updated' };
      const result = { id: 'c-1', ...dto };
      mockService.updateProfile.mockResolvedValue(result);

      expect(await controller.updateProfile(dto, clientUser)).toEqual({ data: result });
      expect(mockService.updateProfile).toHaveBeenCalledWith(dto, clientUser);
    });
  });

  // ─── DASHBOARD ────────────────────────────────────────

  describe('getDashboard', () => {
    it('should return dashboard data', async () => {
      const result = { metrics: {}, taskProgress: [] };
      mockService.getDashboard.mockResolvedValue(result);

      expect(await controller.getDashboard(clientUser)).toEqual({ data: result });
    });
  });

  // ─── PROJECTS ─────────────────────────────────────────

  describe('listProjects', () => {
    it('should return projects', async () => {
      const result = [{ id: 'p-1' }];
      mockService.listProjects.mockResolvedValue(result);

      expect(await controller.listProjects(clientUser)).toEqual({ data: result });
    });
  });

  describe('getProject', () => {
    it('should return a project', async () => {
      const result = { id: 'p-1' };
      mockService.getProject.mockResolvedValue(result);

      expect(await controller.getProject('p-1', clientUser)).toEqual({ data: result });
      expect(mockService.getProject).toHaveBeenCalledWith('p-1', clientUser);
    });
  });

  // ─── TASKS ────────────────────────────────────────────

  describe('getProjectTasks', () => {
    it('should return tasks for project', async () => {
      const result = [{ id: 't-1' }];
      mockService.getProjectTasks.mockResolvedValue(result);

      expect(await controller.getProjectTasks('p-1', clientUser)).toEqual({ data: result });
    });
  });

  // ─── COMMENTS ─────────────────────────────────────────

  describe('createTaskComment', () => {
    it('should create and return a comment', async () => {
      const dto = { content: 'Hello' };
      const result = { id: 'c-1', content: 'Hello' };
      mockService.createTaskComment.mockResolvedValue(result);

      expect(await controller.createTaskComment('t-1', dto, clientUser)).toEqual({
        data: result,
      });
      expect(mockService.createTaskComment).toHaveBeenCalledWith('t-1', 'Hello', clientUser);
    });
  });

  describe('getTaskComments', () => {
    it('should return comments', async () => {
      const result = [{ id: 'c-1' }];
      mockService.getTaskComments.mockResolvedValue(result);

      expect(await controller.getTaskComments('t-1', clientUser)).toEqual({ data: result });
    });
  });

  // ─── REVISIONS ────────────────────────────────────────

  describe('createRevision', () => {
    it('should create and return revision', async () => {
      const dto = { description: 'Fix header' };
      const result = { id: 'r-1' };
      mockService.createRevision.mockResolvedValue(result);

      expect(await controller.createRevision('p-1', dto, clientUser)).toEqual({
        data: result,
      });
    });
  });

  describe('getRevisions', () => {
    it('should return revisions', async () => {
      const result = [{ id: 'r-1' }];
      mockService.getRevisions.mockResolvedValue(result);

      expect(await controller.getRevisions('p-1', clientUser)).toEqual({ data: result });
    });
  });

  // ─── APPROVALS ────────────────────────────────────────

  describe('createApproval', () => {
    it('should create and return approval', async () => {
      const dto = { status: 'APPROVED' as any };
      const result = { id: 'a-1', status: 'APPROVED' };
      mockService.createApproval.mockResolvedValue(result);

      expect(await controller.createApproval('p-1', dto, clientUser)).toEqual({
        data: result,
      });
    });
  });

  describe('getApprovals', () => {
    it('should return approvals', async () => {
      const result = [{ id: 'a-1' }];
      mockService.getApprovals.mockResolvedValue(result);

      expect(await controller.getApprovals('p-1', clientUser)).toEqual({ data: result });
    });
  });

  // ─── DELIVERABLES ─────────────────────────────────────

  describe('getDeliverables', () => {
    it('should return deliverables', async () => {
      const result = [{ id: 'd-1' }];
      mockService.getDeliverables.mockResolvedValue(result);

      expect(await controller.getDeliverables('p-1', clientUser)).toEqual({ data: result });
    });
  });

  // ─── NOTIFICATIONS ────────────────────────────────────

  describe('getNotifications', () => {
    it('should return notifications', async () => {
      const result = [{ id: 'n-1' }];
      mockService.getNotifications.mockResolvedValue(result);

      expect(await controller.getNotifications(clientUser)).toEqual({ data: result });
    });
  });

  describe('markNotificationRead', () => {
    it('should mark notification as read', async () => {
      const result = { id: 'n-1', isRead: true };
      mockService.markNotificationRead.mockResolvedValue(result);

      expect(await controller.markNotificationRead('n-1', clientUser)).toEqual({
        data: result,
      });
    });
  });

  describe('markAllNotificationsRead', () => {
    it('should mark all as read', async () => {
      const result = { markedAsRead: 5 };
      mockService.markAllNotificationsRead.mockResolvedValue(result);

      expect(await controller.markAllNotificationsRead(clientUser)).toEqual({
        data: result,
      });
    });
  });

  // ─── FEEDBACK ─────────────────────────────────────────

  describe('createFeedback', () => {
    it('should create and return feedback', async () => {
      const dto = { rating: 5, wouldRecommend: true };
      const result = { id: 'f-1', ...dto };
      mockService.createFeedback.mockResolvedValue(result);

      expect(await controller.createFeedback('p-1', dto, clientUser)).toEqual({
        data: result,
      });
    });
  });

  describe('getFeedback', () => {
    it('should return feedback', async () => {
      const result = { id: 'f-1', rating: 5 };
      mockService.getFeedback.mockResolvedValue(result);

      expect(await controller.getFeedback('p-1', clientUser)).toEqual({ data: result });
    });
  });

  // ─── SUPPORT REQUESTS ─────────────────────────────────

  describe('createSupportRequest', () => {
    it('should create and return support request', async () => {
      const dto = { description: 'Need help' };
      const result = { id: 's-1' };
      mockService.createSupportRequest.mockResolvedValue(result);

      expect(await controller.createSupportRequest('p-1', dto, clientUser)).toEqual({
        data: result,
      });
    });
  });

  describe('getSupportRequests', () => {
    it('should return support requests', async () => {
      const result = [{ id: 's-1' }];
      mockService.getSupportRequests.mockResolvedValue(result);

      expect(await controller.getSupportRequests('p-1', clientUser)).toEqual({
        data: result,
      });
    });
  });
});
