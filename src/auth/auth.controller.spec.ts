import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RoleKey } from '@prisma/client';
import { AuthenticatedUser } from './interfaces/authenticated-request.interface';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    login: jest.fn(),
    getMe: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
        JwtAuthGuard,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return data envelope with access token', async () => {
      const result = { accessToken: 'jwt', user: { id: '1' } };
      mockAuthService.login.mockResolvedValue(result);

      const response = await controller.login({
        email: 'admin@test.com',
        password: 'Admin@123',
      });

      expect(response).toEqual({ data: result });
      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'admin@test.com',
        password: 'Admin@123',
      });
    });
  });

  describe('getMe', () => {
    it('should return current user profile', async () => {
      const user: AuthenticatedUser = {
        id: 'user-1',
        email: 'admin@test.com',
        fullName: 'Admin',
        role: RoleKey.ADMIN,
      };
      const profile = { id: 'user-1', email: 'admin@test.com', role: 'ADMIN' };
      mockAuthService.getMe.mockResolvedValue(profile);

      const response = await controller.getMe(user);

      expect(response).toEqual({ data: profile });
      expect(mockAuthService.getMe).toHaveBeenCalledWith('user-1');
    });
  });
});
