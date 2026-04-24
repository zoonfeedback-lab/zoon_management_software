import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleKey } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTaskDto) {
    await this.ensureProjectExists(dto.projectId);
    if (dto.assignedToId) {
      await this.ensureAssigneeBelongsToProject(
        dto.projectId,
        dto.assignedToId,
      );
    }

    return this.prisma.task.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() ?? null,
        priority: dto.priority.trim(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        projectId: dto.projectId,
        assignedToId: dto.assignedToId ?? null,
      },
      include: {
        project: true,
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async findAll(user: AuthenticatedUser) {
    return this.prisma.task.findMany({
      where:
        user.role === RoleKey.ADMIN ? undefined : { assignedToId: user.id },
      include: {
        project: true,
        assignedTo: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    if (user.role !== RoleKey.ADMIN && task.assignedToId !== user.id) {
      throw new ForbiddenException('You can only view assigned tasks');
    }
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, user: AuthenticatedUser) {
    const existing = await this.findOne(id, user);

    if (user.role !== RoleKey.ADMIN && dto.assignedToId) {
      throw new ForbiddenException('Only admin can reassign tasks');
    }
    if (user.role !== RoleKey.ADMIN && dto.title) {
      throw new ForbiddenException('Only admin can update task details');
    }
    if (dto.assignedToId) {
      await this.ensureAssigneeBelongsToProject(
        existing.projectId,
        dto.assignedToId,
      );
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        title: user.role === RoleKey.ADMIN ? dto.title?.trim() : undefined,
        description:
          user.role === RoleKey.ADMIN ? dto.description?.trim() : undefined,
        priority:
          user.role === RoleKey.ADMIN ? dto.priority?.trim() : undefined,
        dueDate:
          user.role === RoleKey.ADMIN && dto.dueDate
            ? new Date(dto.dueDate)
            : undefined,
        assignedToId:
          user.role === RoleKey.ADMIN ? dto.assignedToId : undefined,
        status: dto.status,
      },
      include: {
        project: true,
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async findByProject(projectId: string, user: AuthenticatedUser) {
    await this.ensureProjectExists(projectId);
    return this.prisma.task.findMany({
      where:
        user.role === RoleKey.ADMIN
          ? { projectId }
          : { projectId, assignedToId: user.id },
      include: {
        assignedTo: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(userId: string, requester: AuthenticatedUser) {
    if (requester.role !== RoleKey.ADMIN && requester.id !== userId) {
      throw new ForbiddenException('You can only view your assigned tasks');
    }
    return this.prisma.task.findMany({
      where: { assignedToId: userId },
      include: { project: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async ensureProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }

  private async ensureAssigneeBelongsToProject(
    projectId: string,
    userId: string,
  ) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { id: true },
    });
    if (!member) {
      throw new ForbiddenException(
        'Assigned user must be a member of the project',
      );
    }
  }
}
