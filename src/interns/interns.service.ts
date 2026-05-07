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
import { CreateInternDto } from './dto/create-intern.dto';
import { UpdateInternDto } from './dto/update-intern.dto';

const internPublicSelect = {
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
export class InternsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInternDto) {
    const role = await this.prisma.role.findUnique({
      where: { key: RoleKey.INTERNEE },
      select: { id: true },
    });
    if (!role) {
      throw new NotFoundException('INTERNEE role not found');
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
          jobTitle: dto.degreeProgram?.trim() ?? null,
          department: dto.universityName?.trim() ?? null,
          experienceLevel: dto.currentSemester?.trim() ?? null,
          skills: dto.skills ?? [],
          availabilityStatus: dto.availabilityStatus,
          mustChangePassword: true,
        },
        select: internPublicSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Intern email already exists');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: {
        role: { key: RoleKey.INTERNEE },
      },
      select: internPublicSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(internId: string, requester: AuthenticatedUser) {
    if (requester.role !== RoleKey.ADMIN && requester.id !== internId) {
      throw new ForbiddenException('You can only view your own profile');
    }
    return this.getInternByIdOrThrow(internId);
  }

  async update(
    internId: string,
    dto: UpdateInternDto,
    requester: AuthenticatedUser,
  ) {
    if (requester.role !== RoleKey.ADMIN && requester.id !== internId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const updated = await this.prisma.user.update({
      where: { id: internId },
      data: {
        fullName: dto.fullName?.trim(),
        phone: dto.phone?.trim(),
        jobTitle: dto.degreeProgram?.trim(),
        department: dto.universityName?.trim(),
        experienceLevel: dto.currentSemester?.trim(),
        skills: dto.skills,
        availabilityStatus: dto.availabilityStatus,
        isActive: requester.role === RoleKey.ADMIN ? dto.isActive : undefined,
      },
      select: internPublicSelect,
    });

    return updated;
  }

  private async getInternByIdOrThrow(id: string) {
    const intern = await this.prisma.user.findUnique({
      where: { id },
      select: internPublicSelect,
    });
    if (!intern) {
      throw new NotFoundException('Intern not found');
    }
    return intern;
  }
}
