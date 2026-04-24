import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleKey } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    this.validateProjectDates(dto.startDate, dto.deadline);
    await this.ensureClientExists(dto.clientId);
    const memberIds = dto.memberIds ? [...new Set(dto.memberIds)] : [];
    await this.ensureUsersExist(memberIds);

    return this.prisma.project.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        clientId: dto.clientId,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        members: memberIds.length
          ? {
              create: memberIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: {
        client: true,
        members: {
          include: { user: { select: { id: true, fullName: true } } },
        },
      },
    });
  }

  async findAll(user: AuthenticatedUser) {
    return this.prisma.project.findMany({
      where:
        user.role === RoleKey.ADMIN
          ? undefined
          : { members: { some: { userId: user.id } } },
      include: {
        client: true,
        members: {
          include: { user: { select: { id: true, fullName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        members: {
          include: { user: { select: { id: true, fullName: true } } },
        },
      },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (user.role !== RoleKey.ADMIN) {
      const isMember = project.members.some((m) => m.userId === user.id);
      if (!isMember) {
        throw new ForbiddenException(
          'You can only view your assigned projects',
        );
      }
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto, user?: AuthenticatedUser) {
    // using user as a dummy passed from controller if needed, but we check permissions via decorator
    await this.findOne(
      id,
      user || { id: '', email: '', fullName: '', role: RoleKey.ADMIN },
    );
    this.validateProjectDates(dto.startDate, dto.deadline);
    if (dto.clientId) {
      await this.ensureClientExists(dto.clientId);
    }
    if (dto.memberIds) {
      await this.ensureUsersExist([...new Set(dto.memberIds)]);
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        status: dto.status,
        clientId: dto.clientId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        members: dto.memberIds
          ? {
              deleteMany: {},
              create: [...new Set(dto.memberIds)].map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: {
        client: true,
        members: {
          include: { user: { select: { id: true, fullName: true } } },
        },
      },
    });
  }

  private async ensureClientExists(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }
  }

  private async ensureUsersExist(userIds: string[]) {
    if (!userIds.length) {
      return;
    }
    const count = await this.prisma.user.count({
      where: { id: { in: userIds }, isActive: true },
    });
    if (count !== userIds.length) {
      throw new NotFoundException('One or more team members were not found');
    }
  }

  private validateProjectDates(startDate?: string, deadline?: string) {
    if (!startDate || !deadline) {
      return;
    }

    const start = new Date(startDate);
    const end = new Date(deadline);
    if (start > end) {
      throw new BadRequestException(
        'Start date must be before or equal to deadline',
      );
    }
  }
}
