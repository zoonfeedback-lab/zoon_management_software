import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateClientInviteDto } from '../auth/dto/create-client-invite.dto';
import { UpdateRevisionStatusDto } from './dto/update-revision-status.dto';
import { UpdateSupportRequestStatusDto } from './dto/update-support-request-status.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { UpdateClientDto } from '../clients/dto/update-client.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  // ─── CLIENT MANAGEMENT ────────────────────────────────

  async createClientInvite(dto: CreateClientInviteDto) {
    return this.authService.createClientInvite(dto);
  }

  async deactivateClient(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { authUserId: true },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (client.authUserId) {
      await this.prisma.user.update({
        where: { id: client.authUserId },
        data: { isActive: false },
      });
      await this.authService.revokeUserSessions(client.authUserId);
    }

    return this.prisma.client.update({
      where: { id: clientId },
      data: { isActive: false },
    });
  }

  async resendClientInvite(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const dto: CreateClientInviteDto = {
      email: client.email,
      name: client.contactPerson,
      companyName: client.companyName,
      phone: client.phone ?? undefined,
    };

    return this.authService.createClientInvite(dto);
  }

  async revokeClientSessions(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { authUserId: true },
    });

    if (!client || !client.authUserId) {
      throw new NotFoundException('Client or linked user not found');
    }

    return this.authService.revokeUserSessions(client.authUserId);
  }

  async listClients() {
    return this.prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        authUser: {
          select: { id: true, email: true, isActive: true },
        },
      },
    });
  }

  async getClient(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        authUser: {
          select: { id: true, email: true, isActive: true },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  async updateClient(id: string, dto: UpdateClientDto) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        companyName: dto.companyName?.trim(),
        contactPerson: dto.contactPerson?.trim(),
        email: dto.email?.toLowerCase().trim(),
        phone: dto.phone?.trim(),
      },
    });
  }

  // ─── REVISION REQUESTS ────────────────────────────────

  async listRevisions(projectId: string) {
    await this.ensureProjectExists(projectId);

    return this.prisma.revisionRequest.findMany({
      where: { projectId },
      include: {
        client: {
          select: { id: true, companyName: true, contactPerson: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRevisionStatus(id: string, dto: UpdateRevisionStatusDto) {
    const revision = await this.prisma.revisionRequest.findUnique({
      where: { id },
      select: { id: true, clientId: true, projectId: true },
    });

    if (!revision) {
      throw new NotFoundException('Revision request not found');
    }

    const updated = await this.prisma.revisionRequest.update({
      where: { id },
      data: { status: dto.status },
      include: {
        client: { select: { id: true, companyName: true } },
      },
    });

    // Notify the client about the status change
    await this.prisma.clientNotification.create({
      data: {
        clientId: revision.clientId,
        title: 'Revision request updated',
        message: `Your revision request has been ${dto.status.toLowerCase()}.`,
      },
    });

    return updated;
  }

  // ─── SUPPORT REQUESTS ─────────────────────────────────

  async listSupportRequests(projectId: string) {
    await this.ensureProjectExists(projectId);

    return this.prisma.supportRequest.findMany({
      where: { projectId },
      include: {
        client: {
          select: { id: true, companyName: true, contactPerson: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSupportRequestStatus(
    id: string,
    dto: UpdateSupportRequestStatusDto,
  ) {
    const request = await this.prisma.supportRequest.findUnique({
      where: { id },
      select: { id: true, clientId: true },
    });

    if (!request) {
      throw new NotFoundException('Support request not found');
    }

    const updated = await this.prisma.supportRequest.update({
      where: { id },
      data: { status: dto.status },
      include: {
        client: { select: { id: true, companyName: true } },
      },
    });

    // Notify the client about the status change
    await this.prisma.clientNotification.create({
      data: {
        clientId: request.clientId,
        title: 'Support request updated',
        message: `Your support request status has been updated to ${dto.status.toLowerCase().replace('_', ' ')}.`,
      },
    });

    return updated;
  }

  // ─── NOTIFICATIONS ────────────────────────────────────

  async sendNotification(clientId: string, dto: SendNotificationDto) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return this.prisma.clientNotification.create({
      data: {
        clientId,
        title: dto.title.trim(),
        message: dto.message.trim(),
      },
    });
  }

  // ─── HELPERS ──────────────────────────────────────────

  private async ensureProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }
}
