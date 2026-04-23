import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleKey } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userPublicSelect = {
  id: true,
  email: true,
  fullName: true,
  isActive: true,
  phone: true,
  jobTitle: true,
  department: true,
  experienceLevel: true,
  skills: true,
  availabilityStatus: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { key: true, name: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const role = await this.prisma.role.findUnique({
      where: { key: dto.role },
      select: { id: true },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    try {
      const passwordHash = await bcrypt.hash(dto.password, 10);
      return await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          fullName: dto.fullName.trim(),
          roleId: role.id,
          phone: dto.phone?.trim() ?? null,
          jobTitle: dto.jobTitle?.trim() ?? null,
          department: dto.department?.trim() ?? null,
          experienceLevel: dto.experienceLevel?.trim() ?? null,
          skills: dto.skills ?? [],
          availabilityStatus: dto.availabilityStatus,
        },
        select: userPublicSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User email already exists');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: userPublicSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, requester: AuthenticatedUser) {
    if (requester.role !== RoleKey.ADMIN && requester.id !== userId) {
      throw new ForbiddenException('You can only view your own profile');
    }
    return this.getUserByIdOrThrow(userId);
  }

  async update(userId: string, dto: UpdateUserDto, requester: AuthenticatedUser) {
    if (requester.role !== RoleKey.ADMIN && requester.id !== userId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName?.trim(),
        phone: dto.phone?.trim(),
        jobTitle: dto.jobTitle?.trim(),
        department: dto.department?.trim(),
        experienceLevel: dto.experienceLevel?.trim(),
        skills: dto.skills,
        availabilityStatus: dto.availabilityStatus,
        isActive: requester.role === RoleKey.ADMIN ? dto.isActive : undefined,
      },
      select: userPublicSelect,
    });

    return updated;
  }

  private async getUserByIdOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
