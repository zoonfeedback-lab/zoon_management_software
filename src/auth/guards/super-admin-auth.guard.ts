import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

interface JwtPayload {
  sub: string;
  email: string;
  role: 'SUPER_ADMIN';
}

@Injectable()
export class SuperAdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & { headers: Record<string, string> }>();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (payload.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only Super Admin can access this resource');
    }

    const superAdmin = await this.prisma.superAdmin.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, isActive: true },
    });

    if (!superAdmin || !superAdmin.isActive) {
      throw new UnauthorizedException('Super Admin is not active');
    }

    request.superAdmin = {
      id: superAdmin.id,
      email: superAdmin.email,
    };

    return true;
  }
}
