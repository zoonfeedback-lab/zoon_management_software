import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';

@Injectable()
export class DeliverablesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDeliverableDto, uploadedById: string) {
    await this.ensureProjectExists(dto.projectId);

    return this.prisma.deliverable.create({
      data: {
        fileName: dto.fileName.trim(),
        fileUrl: dto.fileUrl.trim(),
        fileType: dto.fileType?.trim() ?? null,
        fileSize: dto.fileSize ?? null,
        description: dto.description?.trim() ?? null,
        projectId: dto.projectId,
        uploadedById,
      },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async findByProject(projectId: string) {
    await this.ensureProjectExists(projectId);

    return this.prisma.deliverable.findMany({
      where: { projectId },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string) {
    const deliverable = await this.prisma.deliverable.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!deliverable) {
      throw new NotFoundException('Deliverable not found');
    }

    await this.prisma.deliverable.delete({ where: { id } });
    return { deleted: true };
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
}
