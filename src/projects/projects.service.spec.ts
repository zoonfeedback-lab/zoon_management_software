import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RoleKey } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';

interface MockPrisma {
  client: { findUnique: jest.Mock };
  user: { count: jest.Mock };
  project: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
}

describe('ProjectsService (unit)', () => {
  let service: ProjectsService;

  const prisma: MockPrisma = {
    client: { findUnique: jest.fn() },
    user: { count: jest.fn() },
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectsService(prisma as unknown as PrismaService);
  });

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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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

  it('findAll limits team member visibility', async () => {
    prisma.project.findMany.mockResolvedValue([]);
    await service.findAll({
      id: 'u-1',
      email: 'user@test.com',
      fullName: 'User',
      role: RoleKey.CORE_TEAM,
    });

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { members: { some: { userId: 'u-1' } } },
      }),
    );
  });
});
