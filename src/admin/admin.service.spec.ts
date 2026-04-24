import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService (unit)', () => {
  let service: AdminService;

  const prisma = {
    project: { findUnique: jest.fn() },
    revisionRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    supportRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    clientNotification: { create: jest.fn() },
    client: { findUnique: jest.fn() },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(prisma);
  });

  // ─── REVISIONS ────────────────────────────────────────

  describe('listRevisions', () => {
    it('should return revisions for existing project', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'p-1' });
      prisma.revisionRequest.findMany.mockResolvedValue([{ id: 'r-1' }]);

      const result = await service.listRevisions('p-1');

      expect(result).toEqual([{ id: 'r-1' }]);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(service.listRevisions('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateRevisionStatus', () => {
    it('should update revision and send notification', async () => {
      prisma.revisionRequest.findUnique.mockResolvedValue({
        id: 'r-1',
        clientId: 'c-1',
        projectId: 'p-1',
      });
      prisma.revisionRequest.update.mockResolvedValue({ id: 'r-1', status: 'APPROVED' });
      prisma.clientNotification.create.mockResolvedValue({});

      const result = await service.updateRevisionStatus('r-1', {
        status: 'APPROVED' as any,
      });

      expect(result.status).toBe('APPROVED');
      expect(prisma.clientNotification.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when revision not found', async () => {
      prisma.revisionRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRevisionStatus('missing', { status: 'APPROVED' as any }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── SUPPORT REQUESTS ─────────────────────────────────

  describe('listSupportRequests', () => {
    it('should return support requests for existing project', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'p-1' });
      prisma.supportRequest.findMany.mockResolvedValue([{ id: 's-1' }]);

      const result = await service.listSupportRequests('p-1');

      expect(result).toEqual([{ id: 's-1' }]);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(service.listSupportRequests('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateSupportRequestStatus', () => {
    it('should update support request and send notification', async () => {
      prisma.supportRequest.findUnique.mockResolvedValue({
        id: 's-1',
        clientId: 'c-1',
      });
      prisma.supportRequest.update.mockResolvedValue({ id: 's-1', status: 'RESOLVED' });
      prisma.clientNotification.create.mockResolvedValue({});

      const result = await service.updateSupportRequestStatus('s-1', {
        status: 'RESOLVED' as any,
      });

      expect(result.status).toBe('RESOLVED');
      expect(prisma.clientNotification.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when support request not found', async () => {
      prisma.supportRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSupportRequestStatus('missing', { status: 'RESOLVED' as any }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── NOTIFICATIONS ────────────────────────────────────

  describe('sendNotification', () => {
    it('should send a notification to existing client', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'c-1' });
      prisma.clientNotification.create.mockResolvedValue({
        id: 'n-1',
        title: 'Test',
        message: 'Hello',
      });

      const result = await service.sendNotification('c-1', {
        title: '  Test  ',
        message: '  Hello  ',
      });

      expect(result.id).toBe('n-1');
    });

    it('should throw NotFoundException when client not found', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      await expect(
        service.sendNotification('missing', { title: 'Test', message: 'Hello' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
