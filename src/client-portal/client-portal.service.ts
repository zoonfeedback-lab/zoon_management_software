import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, Prisma, RoleKey } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { CreateRevisionRequestDto } from './dto/create-revision-request.dto';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';

@Injectable()
export class ClientPortalService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── 2.1 CLIENT PROFILE ───────────────────────────────

  async getProfile(user: AuthenticatedUser) {
    const client = await this.getClientContext(user);

    const profile = await this.prisma.client.findUnique({
      where: { id: client.id },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            deadline: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    return profile;
  }

  async updateProfile(dto: UpdateClientProfileDto, user: AuthenticatedUser) {
    const client = await this.getClientContext(user);
    return this.prisma.client.update({
      where: { id: client.id },
      data: {
        contactPerson: dto.contactPerson?.trim(),
        companyName: dto.companyName?.trim(),
        email: dto.email?.toLowerCase().trim(),
        phone: dto.phone?.trim(),
      },
    });
  }

  // ─── 2.2 CLIENT DASHBOARD ─────────────────────────────

  async getDashboard(user: AuthenticatedUser) {
    const client = await this.getClientContext(user);
    const projectIds = await this.getProjectIds(client.id);

    const [activeProjects, pendingApprovals, recentUpdates, notifications] =
      await Promise.all([
        this.prisma.project.count({
          where: { clientId: client.id, status: { in: ['DRAFT', 'ACTIVE'] } },
        }),
        this.prisma.projectApproval.count({
          where: { clientId: client.id, status: ApprovalStatus.PENDING },
        }),
        this.prisma.project.findMany({
          where: { clientId: client.id },
          select: { id: true, name: true, status: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        }),
        this.prisma.clientNotification.findMany({
          where: { clientId: client.id },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    const taskProgress = await this.prisma.task.groupBy({
      by: ['status'],
      where: { projectId: { in: projectIds } },
      _count: { _all: true },
    });

    const unreadNotifications = await this.prisma.clientNotification.count({
      where: { clientId: client.id, isRead: false },
    });

    return {
      client: {
        id: client.id,
        companyName: client.companyName,
        contactPerson: client.contactPerson,
      },
      metrics: {
        activeProjects,
        pendingApprovals,
        unreadNotifications,
      },
      taskProgress,
      recentUpdates,
      notifications,
    };
  }

  // ─── 2.3 PROJECT ACCESS ───────────────────────────────

  async listProjects(user: AuthenticatedUser) {
    const client = await this.getClientContext(user);
    return this.prisma.project.findMany({
      where: { clientId: client.id },
      include: {
        members: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getProject(projectId: string, user: AuthenticatedUser) {
    const client = await this.getClientContext(user);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, clientId: client.id },
      include: {
        members: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  // ─── 2.4 TASK VISIBILITY ──────────────────────────────

  async getProjectTasks(projectId: string, user: AuthenticatedUser) {
    await this.getProject(projectId, user);
    return this.prisma.task.findMany({
      where: { projectId },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        dueDate: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── 2.5 COMMUNICATION ────────────────────────────────

  async createTaskComment(
    taskId: string,
    content: string,
    user: AuthenticatedUser,
  ) {
    const client = await this.getClientContext(user);
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { clientId: true } } },
    });

    if (!task || task.project.clientId !== client.id) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.taskComment.create({
      data: {
        taskId,
        content: content.trim(),
        userId: user.id,
      },
      include: { user: { select: { id: true, fullName: true } } },
    });
  }

  async getTaskComments(taskId: string, user: AuthenticatedUser) {
    const client = await this.getClientContext(user);
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { clientId: true } } },
    });

    if (!task || task.project.clientId !== client.id) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.taskComment.findMany({
      where: { taskId },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── 2.6 REVISION REQUESTS ────────────────────────────

  async createRevision(
    projectId: string,
    dto: CreateRevisionRequestDto,
    user: AuthenticatedUser,
  ) {
    const client = await this.getClientContext(user);
    await this.getProject(projectId, user);

    const revision = await this.prisma.revisionRequest.create({
      data: {
        projectId,
        clientId: client.id,
        description: dto.description.trim(),
      },
    });

    await this.createNotification(
      client.id,
      'Revision request submitted',
      `Revision request submitted for project ${projectId}.`,
    );

    return revision;
  }

  async getRevisions(projectId: string, user: AuthenticatedUser) {
    await this.getProject(projectId, user);
    const client = await this.getClientContext(user);

    return this.prisma.revisionRequest.findMany({
      where: { projectId, clientId: client.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── 2.7 APPROVAL SYSTEM ──────────────────────────────

  async createApproval(
    projectId: string,
    dto: CreateApprovalDto,
    user: AuthenticatedUser,
  ) {
    const client = await this.getClientContext(user);
    await this.getProject(projectId, user);

    const approval = await this.prisma.projectApproval.create({
      data: {
        projectId,
        clientId: client.id,
        status: dto.status ?? ApprovalStatus.APPROVED,
        comment: dto.comment?.trim() ?? null,
      },
    });

    await this.createNotification(
      client.id,
      'Approval status submitted',
      `Approval response recorded for project ${projectId}.`,
    );

    return approval;
  }

  async getApprovals(projectId: string, user: AuthenticatedUser) {
    await this.getProject(projectId, user);
    const client = await this.getClientContext(user);

    return this.prisma.projectApproval.findMany({
      where: { projectId, clientId: client.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── 2.8 DELIVERABLES ACCESS ──────────────────────────

  async getDeliverables(projectId: string, user: AuthenticatedUser) {
    await this.getProject(projectId, user);

    return this.prisma.deliverable.findMany({
      where: { projectId },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileType: true,
        fileSize: true,
        description: true,
        createdAt: true,
        uploadedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── 2.9 NOTIFICATIONS ────────────────────────────────

  async getNotifications(user: AuthenticatedUser) {
    const client = await this.getClientContext(user);
    return this.prisma.clientNotification.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markNotificationRead(notificationId: string, user: AuthenticatedUser) {
    const client = await this.getClientContext(user);

    const notification = await this.prisma.clientNotification.findFirst({
      where: { id: notificationId, clientId: client.id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.clientNotification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllNotificationsRead(user: AuthenticatedUser) {
    const client = await this.getClientContext(user);

    const result = await this.prisma.clientNotification.updateMany({
      where: { clientId: client.id, isRead: false },
      data: { isRead: true },
    });

    return { markedAsRead: result.count };
  }

  // ─── 2.10 FEEDBACK SYSTEM ─────────────────────────────

  async createFeedback(
    projectId: string,
    dto: CreateFeedbackDto,
    user: AuthenticatedUser,
  ) {
    const client = await this.getClientContext(user);
    await this.getProject(projectId, user);

    try {
      return await this.prisma.clientFeedback.create({
        data: {
          projectId,
          clientId: client.id,
          rating: dto.rating,
          communication: dto.communication?.trim() ?? null,
          quality: dto.quality?.trim() ?? null,
          value: dto.value?.trim() ?? null,
          wouldRecommend: dto.wouldRecommend,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Feedback already submitted for this project',
        );
      }
      throw error;
    }
  }

  async getFeedback(projectId: string, user: AuthenticatedUser) {
    await this.getProject(projectId, user);
    const client = await this.getClientContext(user);

    return this.prisma.clientFeedback.findFirst({
      where: { projectId, clientId: client.id },
    });
  }

  // ─── 2.11 POST-DELIVERY SUPPORT ───────────────────────

  async createSupportRequest(
    projectId: string,
    dto: CreateSupportRequestDto,
    user: AuthenticatedUser,
  ) {
    const client = await this.getClientContext(user);
    const project = await this.getProject(projectId, user);
    const now = new Date();
    const deliveryDate = project.updatedAt;
    const supportDeadline = new Date(
      deliveryDate.getTime() + 15 * 24 * 60 * 60 * 1000,
    );

    if (now > supportDeadline) {
      throw new ForbiddenException(
        'Support window has expired for this project',
      );
    }

    return this.prisma.supportRequest.create({
      data: {
        projectId,
        clientId: client.id,
        description: dto.description.trim(),
      },
    });
  }

  async getSupportRequests(projectId: string, user: AuthenticatedUser) {
    await this.getProject(projectId, user);
    const client = await this.getClientContext(user);

    return this.prisma.supportRequest.findMany({
      where: { projectId, clientId: client.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── HELPERS ──────────────────────────────────────────

  private async getClientContext(user: AuthenticatedUser) {
    if (user.role !== RoleKey.CLIENT) {
      throw new ForbiddenException('Client-only endpoint');
    }

    const client = await this.prisma.client.findFirst({
      where: { authUserId: user.id, isActive: true },
      select: {
        id: true,
        companyName: true,
        contactPerson: true,
      },
    });

    if (!client) {
      throw new ForbiddenException(
        'No active client profile is linked to this user',
      );
    }

    return client;
  }

  private async getProjectIds(clientId: string) {
    const projects = await this.prisma.project.findMany({
      where: { clientId },
      select: { id: true },
    });
    return projects.map((project) => project.id);
  }

  private async createNotification(
    clientId: string,
    title: string,
    message: string,
  ) {
    await this.prisma.clientNotification.create({
      data: {
        clientId,
        title,
        message,
      },
    });
  }
}
