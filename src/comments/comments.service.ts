import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleKey } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(taskId: string, dto: CreateCommentDto, user: AuthenticatedUser) {
    const task = await this.getTask(taskId);
    if (user.role !== RoleKey.ADMIN && task.assignedToId !== user.id) {
      throw new ForbiddenException(
        'Only assigned users or admin can comment on this task',
      );
    }

    return this.prisma.taskComment.create({
      data: {
        content: dto.content.trim(),
        taskId,
        userId: user.id,
      },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });
  }

  async findByTask(taskId: string, user: AuthenticatedUser) {
    const task = await this.getTask(taskId);
    if (user.role !== RoleKey.ADMIN && task.assignedToId !== user.id) {
      throw new ForbiddenException('You cannot view comments for this task');
    }

    return this.prisma.taskComment.findMany({
      where: { taskId },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async getTask(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, assignedToId: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }
}
