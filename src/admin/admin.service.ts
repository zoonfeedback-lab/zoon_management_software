import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateRevisionStatusDto } from './dto/update-revision-status.dto';
import { UpdateSupportRequestStatusDto } from './dto/update-support-request-status.dto';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── REVISION REQUESTS ────────────────────────────────

  async listRevisions(projectId: string) {
    await this.ensureProjectExists(projectId);

    return this.prisma.revisionRequest.findMany({
      where: { projectId },
      include: {
        client: { select: { id: true, companyName: true, contactPerson: true } },
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
        client: { select: { id: true, companyName: true, contactPerson: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSupportRequestStatus(id: string, dto: UpdateSupportRequestStatusDto) {
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
