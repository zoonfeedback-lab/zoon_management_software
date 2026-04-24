import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleKey } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';

@Injectable()
export class ProjectManagerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all projects managed by the current user
   */
  async getManagedProjects(user: AuthenticatedUser) {
    if (user.role !== RoleKey.TEAM_MEMBER) {
      throw new ForbiddenException('Only team members can be project managers');
    }

    const projects = await this.prisma.project.findMany({
      where: {
        projectManagerId: user.id,
        isActive: true,
      },
      include: {
        client: {
          select: { id: true, companyName: true, email: true },
        },
        projectManager: {
          select: { id: true, fullName: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, jobTitle: true },
            },
          },
        },
        tasks: {
          select: { id: true, title: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects;
  }

  /**
   * Get a specific project managed by the current user
   */
  async getManagedProject(projectId: string, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: {
          select: { id: true, companyName: true, email: true },
        },
        projectManager: {
          select: { id: true, fullName: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, jobTitle: true },
            },
          },
        },
        tasks: {
          include: {
            assignedTo: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify the user is the project manager
    if (project.projectManagerId !== user.id) {
      throw new ForbiddenException('You are not the manager of this project');
    }

    return project;
  }

  /**
   * Get team members for a project
   */
  async getProjectTeam(projectId: string, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { projectManagerId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.projectManagerId !== user.id) {
      throw new ForbiddenException('You are not the manager of this project');
    }

    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            jobTitle: true,
            department: true,
            skills: true,
          },
        },
      },
    });

    return members;
  }

  /**
   * Add a team member to a project
   */
  async addTeamMember(projectId: string, memberId: string, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { projectManagerId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.projectManagerId !== user.id) {
      throw new ForbiddenException('You are not the manager of this project');
    }

    // Verify the member is a team member
    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true, role: { select: { key: true } } },
    });

    if (!member) {
      throw new NotFoundException('User not found');
    }

    if (member.role.key !== RoleKey.TEAM_MEMBER) {
      throw new BadRequestException('Only team members can be added to projects');
    }

    // Check if already a member
    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberId } },
    });

    if (existing) {
      throw new BadRequestException('User is already a member of this project');
    }

    const projectMember = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: memberId,
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    return projectMember;
  }

  /**
   * Remove a team member from a project
   */
  async removeTeamMember(projectId: string, memberId: string, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { projectManagerId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.projectManagerId !== user.id) {
      throw new ForbiddenException('You are not the manager of this project');
    }

    const projectMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberId } },
    });

    if (!projectMember) {
      throw new NotFoundException('Team member not found in this project');
    }

    await this.prisma.projectMember.delete({
      where: { id: projectMember.id },
    });

    return { message: 'Team member removed successfully' };
  }

  /**
   * Get all tasks for a project managed by the user
   */
  async getProjectTasks(projectId: string, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { projectManagerId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.projectManagerId !== user.id) {
      throw new ForbiddenException('You are not the manager of this project');
    }

    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      include: {
        assignedTo: {
          select: { id: true, fullName: true, email: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, fullName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        revisions: {
          include: {
            createdBy: {
              select: { id: true, fullName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tasks;
  }

  /**
   * Get a specific task
   */
  async getTask(taskId: string, projectId: string, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { projectManagerId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.projectManagerId !== user.id) {
      throw new ForbiddenException('You are not the manager of this project');
    }

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: {
          select: { id: true, fullName: true, email: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, fullName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        revisions: {
          include: {
            createdBy: {
              select: { id: true, fullName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.projectId !== projectId) {
      throw new BadRequestException('Task does not belong to this project');
    }

    return task;
  }

  /**
   * Assign a task to a team member
   */
  async assignTask(taskId: string, projectId: string, memberId: string, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { projectManagerId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.projectManagerId !== user.id) {
      throw new ForbiddenException('You are not the manager of this project');
    }

    // Verify member exists and is part of the project
    const projectMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberId } },
    });

    if (!projectMember) {
      throw new BadRequestException('Team member is not part of this project');
    }

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.projectId !== projectId) {
      throw new BadRequestException('Task does not belong to this project');
    }

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: { assignedToId: memberId },
      include: {
        assignedTo: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    return updatedTask;
  }

  /**
   * Get tasks assigned to the user (team member view)
   */
  async getAssignedTasks(user: AuthenticatedUser) {
    const tasks = await this.prisma.task.findMany({
      where: {
        assignedToId: user.id,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectManager: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
        comments: {
          include: {
            user: {
              select: { id: true, fullName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        revisions: {
          include: {
            createdBy: {
              select: { id: true, fullName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tasks;
  }
}
