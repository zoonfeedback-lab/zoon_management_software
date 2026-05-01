import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RoleKey } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService (unit)', () => {
  let service: AuthService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
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

  // ─── EMPLOYEE LOGIN ───────────────────────────────────

  describe('employeeLogin', () => {
    const mockEmployee = {
      id: 'emp-1',
      email: 'employee@test.com',
      fullName: 'John Employee',
      passwordHash: 'hashed-password',
      isActive: true,
      mustChangePassword: true,
      role: { key: RoleKey.CORE_TEAM },
    };

    it('should return access token, user and mustChangePassword flag', async () => {
      prisma.user.findUnique.mockResolvedValue(mockEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.signAsync as jest.Mock).mockResolvedValue('emp-jwt-token');

      const result = await service.employeeLogin({
        email: 'employee@test.com',
        password: 'Admin@123',
      });

      expect(result).toEqual({
        accessToken: 'emp-jwt-token',
        mustChangePassword: true,
        user: {
          id: 'emp-1',
          email: 'employee@test.com',
          fullName: 'John Employee',
          role: RoleKey.CORE_TEAM,
        },
      });
    });

    it('should return mustChangePassword false for employees who already changed', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockEmployee,
        mustChangePassword: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.signAsync as jest.Mock).mockResolvedValue('jwt-token');

      const result = await service.employeeLogin({
        email: 'employee@test.com',
        password: 'MyNew@123',
      });

      expect(result.mustChangePassword).toBe(false);
    });

    it('should throw ForbiddenException for non-employee roles', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockEmployee,
        role: { key: RoleKey.ADMIN },
      });

      await expect(
        service.employeeLogin({ email: 'admin@test.com', password: 'pass12345' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw ForbiddenException for client roles', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockEmployee,
        role: { key: RoleKey.CLIENT },
      });

      await expect(
        service.employeeLogin({ email: 'client@test.com', password: 'pass12345' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.employeeLogin({ email: 'nobody@test.com', password: 'pass12345' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.employeeLogin({ email: 'employee@test.com', password: 'wrongPass1' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ─── CHANGE PASSWORD ──────────────────────────────────

  describe('changePassword', () => {
    const mockEmployeeForPw = {
      id: 'emp-1',
      passwordHash: 'hashed-old-password',
      role: { key: RoleKey.CORE_TEAM },
    };

    it('should change password successfully and clear mustChangePassword', async () => {
      prisma.user.findUnique.mockResolvedValue(mockEmployeeForPw);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new-password');
      prisma.user.update.mockResolvedValue({});

      const result = await service.changePassword('emp-1', {
        currentPassword: 'Admin@123',
        newPassword: 'MyNew@456',
      });

      expect(result).toEqual({ message: 'Password changed successfully' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'emp-1' },
        data: {
          passwordHash: 'hashed-new-password',
          mustChangePassword: false,
        },
      });
    });

    it('should throw BadRequestException if current password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(mockEmployeeForPw);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('emp-1', {
          currentPassword: 'WrongOld1',
          newPassword: 'MyNew@456',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw ForbiddenException if user is not an employee', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockEmployeeForPw,
        role: { key: RoleKey.ADMIN },
      });

      await expect(
        service.changePassword('admin-1', {
          currentPassword: 'Admin@123',
          newPassword: 'MyNew@456',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('missing-id', {
          currentPassword: 'Admin@123',
          newPassword: 'MyNew@456',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ─── GET ME ───────────────────────────────────────────

  describe('getMe', () => {
    it('should return user profile with flattened role key and mustChangePassword', async () => {
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
        mustChangePassword: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.user.findUnique.mockResolvedValue(dbUser);

      const result = await service.getMe('user-1');

      expect(result.role).toBe(RoleKey.ADMIN);
      expect(result.email).toBe('admin@test.com');
      expect(result.mustChangePassword).toBe(false);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('missing-id')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
