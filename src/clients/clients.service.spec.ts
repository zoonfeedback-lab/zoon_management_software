import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma, RoleKey } from '@prisma/client';
import { ClientsService } from './clients.service';

describe('ClientsService (unit)', () => {
  let service: ClientsService;

  const prisma = {
    client: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: { findUnique: jest.fn() },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClientsService(prisma);
  });

  describe('create', () => {
    it('should create a client successfully', async () => {
      const dto = {
        companyName: ' Zoon Labs ',
        contactPerson: ' John Doe ',
        email: '  john@zoon.io ',
        phone: ' +923001234567 ',
      };
      prisma.client.create.mockResolvedValue({ id: 'c-1', ...dto });

      const result = await service.create(dto);

      expect(prisma.client.create).toHaveBeenCalledWith({
        data: {
          companyName: 'Zoon Labs',
          contactPerson: 'John Doe',
          email: 'john@zoon.io',
          phone: '+923001234567',
          authUserId: undefined,
        },
      });
      expect(result.id).toBe('c-1');
    });

    it('should verify linked user has CLIENT role when authUserId provided', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        role: { key: RoleKey.CLIENT },
      });
      prisma.client.create.mockResolvedValue({ id: 'c-1' });

      await service.create({
        companyName: 'Test',
        contactPerson: 'Test',
        email: 'test@test.com',
        authUserId: 'u-1',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        select: { id: true, role: { select: { key: true } } },
      });
    });

    it('should throw ForbiddenException when linked user is not CLIENT role', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        role: { key: RoleKey.ADMIN },
      });

      await expect(
        service.create({
          companyName: 'Test',
          contactPerson: 'Test',
          email: 'test@test.com',
          authUserId: 'u-1',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw ConflictException on duplicate email', async () => {
      prisma.client.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.create({
          companyName: 'Test',
          contactPerson: 'Test',
          email: 'dup@test.com',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all clients ordered by creation date', async () => {
      prisma.client.findMany.mockResolvedValue([{ id: 'c-1' }]);

      const result = await service.findAll();

      expect(result).toEqual([{ id: 'c-1' }]);
      expect(prisma.client.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a client by id', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'c-1' });

      const result = await service.findOne('c-1');

      expect(result.id).toBe('c-1');
    });

    it('should throw NotFoundException when client not found', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a client', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'c-1' });
      prisma.client.update.mockResolvedValue({ id: 'c-1', companyName: 'Updated' });

      const result = await service.update('c-1', { companyName: ' Updated ' });

      expect(result.companyName).toBe('Updated');
    });

    it('should throw NotFoundException when updating non-existent client', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { companyName: 'Test' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
