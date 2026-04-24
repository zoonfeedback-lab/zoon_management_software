import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockGuard = { canActivate: () => true };

describe('AdminController', () => {
  let controller: AdminController;

  const mockAdminService = {
    listRevisions: jest.fn(),
    updateRevisionStatus: jest.fn(),
    listSupportRequests: jest.fn(),
    updateSupportRequestStatus: jest.fn(),
    sendNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();

    controller = module.get<AdminController>(AdminController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listRevisions', () => {
    it('should return revisions list', async () => {
      const result = [{ id: 'r-1' }];
      mockAdminService.listRevisions.mockResolvedValue(result);

      expect(await controller.listRevisions('p-1')).toEqual({ data: result });
      expect(mockAdminService.listRevisions).toHaveBeenCalledWith('p-1');
    });
  });

  describe('updateRevisionStatus', () => {
    it('should update and return revision', async () => {
      const dto = { status: 'APPROVED' as any };
      const result = { id: 'r-1', status: 'APPROVED' };
      mockAdminService.updateRevisionStatus.mockResolvedValue(result);

      expect(await controller.updateRevisionStatus('r-1', dto)).toEqual({ data: result });
      expect(mockAdminService.updateRevisionStatus).toHaveBeenCalledWith('r-1', dto);
    });
  });

  describe('listSupportRequests', () => {
    it('should return support requests list', async () => {
      const result = [{ id: 's-1' }];
      mockAdminService.listSupportRequests.mockResolvedValue(result);

      expect(await controller.listSupportRequests('p-1')).toEqual({ data: result });
      expect(mockAdminService.listSupportRequests).toHaveBeenCalledWith('p-1');
    });
  });

  describe('updateSupportRequestStatus', () => {
    it('should update and return support request', async () => {
      const dto = { status: 'RESOLVED' as any };
      const result = { id: 's-1', status: 'RESOLVED' };
      mockAdminService.updateSupportRequestStatus.mockResolvedValue(result);

      expect(await controller.updateSupportRequestStatus('s-1', dto)).toEqual({
        data: result,
      });
    });
  });

  describe('sendNotification', () => {
    it('should send and return notification', async () => {
      const dto = { title: 'Test', message: 'Hello' };
      const result = { id: 'n-1', ...dto };
      mockAdminService.sendNotification.mockResolvedValue(result);

      expect(await controller.sendNotification('c-1', dto)).toEqual({ data: result });
      expect(mockAdminService.sendNotification).toHaveBeenCalledWith('c-1', dto);
    });
  });
});
