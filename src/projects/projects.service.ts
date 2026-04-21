import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    await this.ensureClientExists(dto.clientId);
    await this.ensureUsersExist(dto.memberIds ?? []);

    return this.prisma.project.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        clientId: dto.clientId,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        members: dto.memberIds?.length
          ? {
              create: dto.memberIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: {
        client: true,
        members: { include: { user: { select: { id: true, fullName: true } } } },
      },
    });
  }

  async findAll() {
    return this.prisma.project.findMany({
      include: {
        client: true,
        members: { include: { user: { select: { id: true, fullName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        members: { include: { user: { select: { id: true, fullName: true } } } },
      },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);
    if (dto.clientId) {
      await this.ensureClientExists(dto.clientId);
    }
    if (dto.memberIds) {
      await this.ensureUsersExist(dto.memberIds);
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
              create: dto.memberIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: {
        client: true,
        members: { include: { user: { select: { id: true, fullName: true } } } },
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
}
