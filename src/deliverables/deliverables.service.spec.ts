import { NotFoundException } from '@nestjs/common';
import { DeliverablesService } from './deliverables.service';

describe('DeliverablesService (unit)', () => {
  let service: DeliverablesService;

  const prisma = {
    project: { findUnique: jest.fn() },
    deliverable: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DeliverablesService(prisma);
  });

  describe('create', () => {
    it('should create a deliverable for existing project', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'p-1' });
      prisma.deliverable.create.mockResolvedValue({
        id: 'd-1',
        fileName: 'report.pdf',
      });

      const result = await service.create(
        {
          fileName: '  report.pdf  ',
          fileUrl: '  https://s3.test/report.pdf  ',
          fileType: '  application/pdf  ',
          fileSize: 1024,
          description: '  Final report  ',
          projectId: 'p-1',
        },
        'user-1',
      );

      expect(prisma.deliverable.create).toHaveBeenCalledWith({
        data: {
          fileName: 'report.pdf',
          fileUrl: 'https://s3.test/report.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          description: 'Final report',
          projectId: 'p-1',
          uploadedById: 'user-1',
        },
        include: {
          uploadedBy: { select: { id: true, fullName: true } },
        },
      });
      expect(result.id).toBe('d-1');
    });

    it('should throw NotFoundException when project not found', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            fileName: 'test.pdf',
            fileUrl: 'https://s3.test/test.pdf',
            projectId: 'missing',
          },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findByProject', () => {
    it('should return deliverables for existing project', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'p-1' });
      prisma.deliverable.findMany.mockResolvedValue([{ id: 'd-1' }]);

      const result = await service.findByProject('p-1');

      expect(result).toEqual([{ id: 'd-1' }]);
    });

    it('should throw NotFoundException when project not found', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(service.findByProject('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete an existing deliverable', async () => {
      prisma.deliverable.findUnique.mockResolvedValue({ id: 'd-1' });
      prisma.deliverable.delete.mockResolvedValue({});

      const result = await service.remove('d-1');

      expect(result).toEqual({ deleted: true });
      expect(prisma.deliverable.delete).toHaveBeenCalledWith({
        where: { id: 'd-1' },
      });
    });

    it('should throw NotFoundException when deliverable not found', async () => {
      prisma.deliverable.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
