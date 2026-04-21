import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async loginSuperAdmin(dto: SuperAdminLoginDto): Promise<{
    accessToken: string;
    superAdmin: {
      id: string;
      email: string;
      fullName: string;
    };
  }> {
    const superAdmin = await this.prisma.superAdmin.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!superAdmin || !superAdmin.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, superAdmin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: superAdmin.id,
      email: superAdmin.email,
      role: 'SUPER_ADMIN',
    });

    return {
      accessToken,
      superAdmin: {
        id: superAdmin.id,
        email: superAdmin.email,
        fullName: superAdmin.fullName,
      },
    };
  }
}
