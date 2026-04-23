import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, RoleKey } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UsersService (unit)', () => {
  let service: UsersService;

  const prisma = {
    role: { findUnique: jest.fn() },
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(prisma);
  });

  it('creates user with normalized email and hashed password', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: 'role-1' });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pass');
    prisma.user.create.mockResolvedValue({ id: 'u-1', email: 'admin@test.com' });

    await service.create({
      email: '  Admin@Test.com ',
      password: 'Admin@123',
      fullName: 'John Doe',
      role: RoleKey.ADMIN,
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'admin@test.com',
          passwordHash: 'hashed-pass',
          fullName: 'John Doe',
        }),
      }),
    );
  });

  it('throws not found when role does not exist', async () => {
    prisma.role.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        email: 'a@test.com',
        password: 'Admin@123',
        fullName: 'John Doe',
        role: RoleKey.ADMIN,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps Prisma unique error to conflict exception', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: 'role-1' });
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
        fullName: 'John Doe',
        role: RoleKey.ADMIN,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks non-admin from reading another profile', async () => {
    await expect(
      service.findOne('user-2', {
        id: 'user-1',
        email: 'u1@test.com',
        fullName: 'U1',
        role: RoleKey.TEAM_MEMBER,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
