import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RoleKey } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService (unit)', () => {
  let service: AuthService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  } as any;

  const jwtService = {
    signAsync: jest.fn(),
  } as any as JwtService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma, jwtService);
  });

  // ─── LOGIN ────────────────────────────────────────────

  describe('login', () => {
    const mockUser = {
      id: 'user-1',
      email: 'admin@test.com',
      fullName: 'Admin User',
      passwordHash: 'hashed-password',
      isActive: true,
      role: { key: RoleKey.ADMIN },
    };

    it('should return access token and user on valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.signAsync as jest.Mock).mockResolvedValue('jwt-token');

      const result = await service.login({
        email: '  Admin@Test.com  ',
        password: 'Admin@123',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@test.com' },
        include: { role: true },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('Admin@123', 'hashed-password');
      expect(result).toEqual({
        accessToken: 'jwt-token',
        user: {
          id: 'user-1',
          email: 'admin@test.com',
          fullName: 'Admin User',
          role: RoleKey.ADMIN,
        },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@test.com', password: 'pass' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(
        service.login({ email: 'admin@test.com', password: 'Admin@123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@test.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ─── GET ME ───────────────────────────────────────────

  describe('getMe', () => {
    it('should return user profile with flattened role key', async () => {
      const dbUser = {
        id: 'user-1',
        email: 'admin@test.com',
        fullName: 'Admin User',
        role: { key: RoleKey.ADMIN },
        phone: null,
        jobTitle: 'CTO',
        department: 'Engineering',
        experienceLevel: 'Senior',
        skills: ['nestjs'],
        availabilityStatus: 'AVAILABLE',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.user.findUnique.mockResolvedValue(dbUser);

      const result = await service.getMe('user-1');

      expect(result.role).toBe(RoleKey.ADMIN);
      expect(result.email).toBe('admin@test.com');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('missing-id')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
