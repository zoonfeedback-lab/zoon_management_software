import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RevisionStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { CreateTaskRevisionDto } from './dto/create-task-revision.dto';

@Injectable()
export class TaskRevisionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new task revision (feedback from project manager)
   */
  async createRevision(
    taskId: string,
    projectId: string,
    dto: CreateTaskRevisionDto,
    user: AuthenticatedUser,
  ) {
    // Verify the user is the project manager
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { projectManagerId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.projectManagerId !== user.id) {
      throw new ForbiddenException('Only the project manager can create revisions');
    }

    // Verify the task exists and belongs to this project
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true, status: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.projectId !== projectId) {
      throw new BadRequestException('Task does not belong to this project');
    }

    const revision = await this.prisma.taskRevision.create({
      data: {
        feedback: dto.feedback,
        taskId,
        projectId,
        createdById: user.id,
        status: RevisionStatus.PENDING,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        task: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    return revision;
  }

  /**
   * Get all revisions for a task
   */
  async getTaskRevisions(taskId: string, projectId: string, user: AuthenticatedUser) {
    // Verify the task exists and belongs to this project
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: { projectManagerId: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.projectId !== projectId) {
      throw new BadRequestException('Task does not belong to this project');
    }

    // Verify access: either PM or assigned to the task
    if (!task.project || (task.project.projectManagerId !== user.id && task.assignedToId !== user.id)) {
      throw new ForbiddenException('You do not have access to this task');
    }

    const revisions = await this.prisma.taskRevision.findMany({
      where: { taskId },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return revisions;
  }

  /**
   * Approve a revision (task is done)
   */
  async approveRevision(revisionId: string, projectId: string, user: AuthenticatedUser) {
    const revision = await this.prisma.taskRevision.findUnique({
      where: { id: revisionId },
      include: {
        task: {
          select: { projectId: true },
        },
      },
    });

    if (!revision) {
      throw new NotFoundException('Revision not found');
    }

    if (revision.projectId !== projectId) {
      throw new BadRequestException('Revision does not belong to this project');
    }

    // Verify the user is the project manager
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { projectManagerId: true },
    });

    if (!project || project.projectManagerId !== user.id) {
      throw new ForbiddenException('Only the project manager can approve revisions');
    }

    const updatedRevision = await this.prisma.taskRevision.update({
      where: { id: revisionId },
      data: { status: RevisionStatus.APPROVED },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    return updatedRevision;
  }

  /**
   * Reject a revision (send back for more changes)
   */
  async rejectRevision(revisionId: string, projectId: string, feedback: string, user: AuthenticatedUser) {
    const revision = await this.prisma.taskRevision.findUnique({
      where: { id: revisionId },
      include: {
        task: {
          select: { projectId: true },
        },
      },
    });

    if (!revision) {
      throw new NotFoundException('Revision not found');
    }

    if (revision.projectId !== projectId) {
      throw new BadRequestException('Revision does not belong to this project');
    }

    // Verify the user is the project manager
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { projectManagerId: true },
    });

    if (!project || project.projectManagerId !== user.id) {
      throw new ForbiddenException('Only the project manager can reject revisions');
    }

    const updatedRevision = await this.prisma.taskRevision.update({
      where: { id: revisionId },
      data: { status: RevisionStatus.REJECTED },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    // Create a new revision request with the feedback
    await this.prisma.taskRevision.create({
      data: {
        feedback,
        taskId: revision.taskId,
        projectId,
        createdById: user.id,
        status: RevisionStatus.PENDING,
      },
    });

    return updatedRevision;
  }
}
