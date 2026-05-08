import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleKey } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthMailerService } from './auth-mailer.service';
import { LoginDto } from './dto/login.dto';
import { EmployeeLoginDto } from './dto/employee-login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateClientInviteDto } from './dto/create-client-invite.dto';
import { SetupPasswordDto } from './dto/setup-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { generateOpaqueToken, sha256 } from './utils/token.util';

interface SessionContext {
  ipAddress?: string;
  userAgent?: string;
}

interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenMaxAgeMs: number;
}

@Injectable()
export class AuthService {
  private readonly setupTokenTtlMs: number;
  private readonly resetTokenTtlMs: number;
  private readonly refreshTokenTtlMs: number;
  private readonly frontendBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authMailerService: AuthMailerService,
  ) {
    this.setupTokenTtlMs = this.getDurationMs('SETUP_TOKEN_TTL_MS', 24 * 60 * 60 * 1000);
    this.resetTokenTtlMs = this.getDurationMs('RESET_TOKEN_TTL_MS', 15 * 60 * 1000);
    this.refreshTokenTtlMs = this.getDurationMs(
      'REFRESH_TOKEN_TTL_MS',
      30 * 24 * 60 * 60 * 1000,
    );
    this.frontendBaseUrl =
      this.configService.get<string>('FRONTEND_BASE_URL') ??
      'http://localhost:3000';
  }

  async login(dto: LoginDto, session: SessionContext = {}) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Account setup is not completed');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueSessionTokens(
      {
        id: user.id,
        email: user.email,
        role: user.role.key,
      },
      session,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      refreshTokenMaxAgeMs: tokens.refreshTokenMaxAgeMs,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role.key,
      },
    };
  }

  /**
   * Employee-specific login.
   * Validates that the user has an employee role (INTERNEE or CORE_TEAM).
   * Returns a `mustChangePassword` flag so the frontend can redirect
   * the employee to the change-password screen on first login.
   */
  async employeeLogin(dto: EmployeeLoginDto, session: SessionContext = {}) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Only employees (INTERNEE / CORE_TEAM) may use this endpoint
    if (
      user.role.key !== RoleKey.INTERNEE &&
      user.role.key !== RoleKey.CORE_TEAM
    ) {
      throw new ForbiddenException(
        'This login is for employees only. Please use the appropriate login.',
      );
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Account setup is not completed');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueSessionTokens(
      {
        id: user.id,
        email: user.email,
        role: user.role.key,
      },
      session,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      refreshTokenMaxAgeMs: tokens.refreshTokenMaxAgeMs,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role.key,
      },
    };
  }

  /**
   * Allows an authenticated employee to change their password.
   * After a successful change the `mustChangePassword` flag is cleared.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
        role: { select: { key: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Only employees can use this endpoint
    if (
      user.role.key !== RoleKey.INTERNEE &&
      user.role.key !== RoleKey.CORE_TEAM
    ) {
      throw new ForbiddenException('Only employees can change password here');
    }

    if (!user.passwordHash) {
      throw new BadRequestException('Current password is incorrect');
    }

    const isCurrentValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    return { message: 'Password changed successfully' };
  }

  async createClientInvite(dto: CreateClientInviteDto) {
    const email = dto.email.toLowerCase().trim();
    const clientRole = await this.prisma.role.findUnique({
      where: { key: RoleKey.CLIENT },
      select: { id: true },
    });

    if (!clientRole) {
      throw new NotFoundException('CLIENT role not found');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      include: { role: { select: { key: true } } },
    });

    if (existingUser && existingUser.role.key !== RoleKey.CLIENT) {
      throw new ConflictException('A non-client user already exists with this email');
    }

    const user = await this.prisma.user.upsert({
      where: { email },
      update: {
        fullName: dto.name.trim(),
        roleId: clientRole.id,
        isActive: false,
        passwordHash: null,
      },
      create: {
        email,
        fullName: dto.name.trim(),
        roleId: clientRole.id,
        isActive: false,
        passwordHash: null,
      },
      select: { id: true, email: true, fullName: true },
    });

    await this.prisma.client.upsert({
      where: { email },
      update: {
        contactPerson: dto.name.trim(),
        companyName: dto.companyName?.trim() || `${dto.name.trim()}'s Company`,
        phone: dto.phone?.trim() ?? null,
        authUserId: user.id,
        isActive: true,
      },
      create: {
        contactPerson: dto.name.trim(),
        companyName: dto.companyName?.trim() || `${dto.name.trim()}'s Company`,
        email,
        phone: dto.phone?.trim() ?? null,
        authUserId: user.id,
        isActive: true,
      },
      select: { id: true },
    });

    await this.prisma.setupToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = generateOpaqueToken();
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + this.setupTokenTtlMs);
    await this.prisma.setupToken.create({
      data: {
        tokenHash,
        expiresAt,
        userId: user.id,
      },
    });

    const setupLink = `${this.frontendBaseUrl.replace(/\/$/, '')}/setup-account?token=${encodeURIComponent(rawToken)}`;
    await this.authMailerService.sendClientSetupEmail(user.email, setupLink);

    return {
      userId: user.id,
      email: user.email,
      expiresAt,
      ...(this.configService.get<string>('NODE_ENV') !== 'production'
        ? { setupLink }
        : {}),
    };
  }

  async verifySetupToken(token: string) {
    const record = await this.getValidSetupToken(token);
    if (!record) {
      return { valid: false };
    }

    return {
      valid: true,
      email: record.user.email,
    };
  }

  async setupPassword(dto: SetupPasswordDto, session: SessionContext) {
    const setupToken = await this.getValidSetupTokenOrThrow(dto.token);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: setupToken.userId },
        data: {
          passwordHash,
          isActive: true,
        },
      });

      await tx.setupToken.update({
        where: { id: setupToken.id },
        data: { usedAt: new Date() },
      });

      await tx.session.deleteMany({
        where: { userId: setupToken.userId },
      });
    });

    const user = await this.prisma.user.findUnique({
      where: { id: setupToken.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: { select: { key: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = await this.issueSessionTokens(
      { id: user.id, email: user.email, role: user.role.key },
      session,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      refreshTokenMaxAgeMs: tokens.refreshTokenMaxAgeMs,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role.key,
      },
    };
  }

  async refresh(refreshToken: string, session: SessionContext) {
    const refreshTokenHash = sha256(refreshToken);
    const dbSession = await this.prisma.session.findUnique({
      where: { refreshTokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            role: { select: { key: true } },
          },
        },
      },
    });

    if (!dbSession || dbSession.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!dbSession.user.isActive) {
      throw new UnauthorizedException('User account is not active');
    }

    const nextRefreshToken = generateOpaqueToken();
    const nextRefreshHash = sha256(nextRefreshToken);
    const expiresAt = new Date(Date.now() + this.refreshTokenTtlMs);

    await this.prisma.session.update({
      where: { id: dbSession.id },
      data: {
        refreshTokenHash: nextRefreshHash,
        expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      },
    });

    const accessToken = await this.signAccessToken({
      id: dbSession.user.id,
      email: dbSession.user.email,
      role: dbSession.user.role.key,
    });

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      refreshTokenMaxAgeMs: this.refreshTokenTtlMs,
    };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return { message: 'Logged out successfully' };
    }

    await this.prisma.session.deleteMany({
      where: { refreshTokenHash: sha256(refreshToken) },
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Revokes all active sessions for a specific user.
   */
  async revokeUserSessions(userId: string) {
    await this.prisma.session.deleteMany({
      where: { userId },
    });
    return { message: 'All sessions revoked for user' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: { select: { key: true } } },
    });

    if (!user || !user.isActive) {
      return {
        message:
          'If an account exists for this email, a password reset link has been sent.',
      };
    }

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = generateOpaqueToken();
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + this.resetTokenTtlMs);
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetLink = `${this.frontendBaseUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;
    await this.authMailerService.sendPasswordResetEmail(email, resetLink);

    return {
      message:
        'If an account exists for this email, a password reset link has been sent.',
      ...(this.configService.get<string>('NODE_ENV') !== 'production'
        ? { resetLink }
        : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto, session: SessionContext) {
    const tokenHash = sha256(dto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { role: { select: { key: true } } },
        },
      },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt <= new Date() ||
      !resetToken.user.isActive
    ) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.user.id },
        data: { passwordHash },
      });

      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });

      await tx.session.deleteMany({
        where: { userId: resetToken.user.id },
      });
    });

    const tokens = await this.issueSessionTokens(
      {
        id: resetToken.user.id,
        email: resetToken.user.email,
        role: resetToken.user.role.key,
      },
      session,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      refreshTokenMaxAgeMs: tokens.refreshTokenMaxAgeMs,
      user: {
        id: resetToken.user.id,
        email: resetToken.user.email,
        fullName: resetToken.user.fullName,
        role: resetToken.user.role.key,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: {
          select: {
            key: true,
          },
        },
        phone: true,
        jobTitle: true,
        department: true,
        experienceLevel: true,
        skills: true,
        availabilityStatus: true,
        mustChangePassword: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      ...user,
      role: user.role.key,
    };
  }

  private async getValidSetupToken(token: string) {
    const tokenHash = sha256(token);
    const now = new Date();

    return this.prisma.setupToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    }).then((record) => {
      if (!record || record.usedAt || record.expiresAt <= now) {
        return null;
      }
      return record;
    });
  }

  private async getValidSetupTokenOrThrow(token: string) {
    const record = await this.getValidSetupToken(token);
    if (!record) {
      throw new UnauthorizedException('Invalid or expired setup token');
    }

    return record;
  }

  private async signAccessToken(payload: {
    id: string;
    email: string;
    role: RoleKey;
  }) {
    return this.jwtService.signAsync({
      sub: payload.id,
      email: payload.email,
      role: payload.role,
    });
  }

  private async issueSessionTokens(
    payload: { id: string; email: string; role: RoleKey },
    session: SessionContext,
  ): Promise<SessionTokens> {
    const accessToken = await this.signAccessToken(payload);
    const refreshToken = generateOpaqueToken();
    const refreshTokenHash = sha256(refreshToken);
    const expiresAt = new Date(Date.now() + this.refreshTokenTtlMs);

    await this.prisma.session.create({
      data: {
        userId: payload.id,
        refreshTokenHash,
        expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      },
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenMaxAgeMs: this.refreshTokenTtlMs,
    };
  }

  private getDurationMs(configKey: string, fallback: number) {
    const raw = this.configService.get<string>(configKey);
    if (!raw) {
      return fallback;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }
}
