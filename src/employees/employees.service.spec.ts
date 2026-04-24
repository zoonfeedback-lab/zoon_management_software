import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleKey } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { EmployeesService } from './employees.service';
import { EmployeeRole } from './dto/create-employee.dto';
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

describe('EmployeesService (unit)', () => {
  let service: EmployeesService;

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
    service = new EmployeesService(prisma as unknown as PrismaService);
  });

  it('creates employee with normalized email and hashed password', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: 'role-1' });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pass');
    prisma.user.create.mockResolvedValue({
      id: 'u-1',
      email: 'employee@test.com',
    });

    await service.create({
      email: '  Employee@Test.com ',
      password: 'Admin@123',
      fullName: 'John Doe',
      role: EmployeeRole.INTERNEE,
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          email: 'employee@test.com',
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
        role: EmployeeRole.INTERNEE,
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
        role: EmployeeRole.CORE_TEAM,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks non-admin from reading another profile', async () => {
    await expect(
      service.findOne('user-2', {
        id: 'user-1',
        email: 'u1@test.com',
        fullName: 'U1',
        role: RoleKey.CORE_TEAM,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
