import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleKey } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { InternsService } from './interns.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

interface MockPrisma {
  role: { findUnique: jest.Mock };
  user: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
}

describe('InternsService (unit)', () => {
  let service: InternsService;

  const prisma: MockPrisma = {
    role: { findUnique: jest.fn() },
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InternsService(prisma as unknown as PrismaService);
  });

  it('creates intern with INTERNEE role, normalized email and hashed password', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: 'role-intern' });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pass');
    prisma.user.create.mockResolvedValue({
      id: 'u-intern-1',
      email: 'intern@test.com',
    });

    await service.create({
      email: '  Intern@Test.com ',
      password: 'Admin@123',
      fullName: 'Ali Khan',
    });

    expect(prisma.role.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: RoleKey.INTERNEE },
      }),
    );

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          email: 'intern@test.com',
          passwordHash: 'hashed-pass',
          fullName: 'Ali Khan',
        }),
      }),
    );
  });

  it('throws not found when INTERNEE role does not exist', async () => {
    prisma.role.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        email: 'a@test.com',
        password: 'Admin@123',
        fullName: 'Ali Khan',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps Prisma unique error to conflict exception', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: 'role-intern' });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pass');
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.create({
        email: 'duplicate@test.com',
        password: 'Admin@123',
        fullName: 'Ali Khan',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks non-admin from reading another intern profile', async () => {
    await expect(
      service.findOne('intern-2', {
        id: 'intern-1',
        email: 'i1@test.com',
        fullName: 'I1',
        role: RoleKey.INTERNEE,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
