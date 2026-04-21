import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTeamMemberDto) {
    try {
      return await this.prisma.teamMember.create({
        data: {
          fullName: dto.fullName.trim(),
          email: dto.email.toLowerCase().trim(),
          role: dto.role.trim(),
          phone: dto.phone?.trim() ?? null,
          department: dto.department.trim(),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Team member email already exists');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.teamMember.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateTeamMemberDto) {
    await this.ensureExists(id);
    try {
      return await this.prisma.teamMember.update({
        where: { id },
        data: {
          fullName: dto.fullName?.trim(),
          email: dto.email?.toLowerCase().trim(),
          role: dto.role?.trim(),
          phone: dto.phone?.trim(),
          department: dto.department?.trim(),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Team member email already exists');
      }
      throw error;
    }
  }

  async deactivate(id: string) {
    return this.setActive(id, false);
  }

  async reactivate(id: string) {
    return this.setActive(id, true);
  }

  private async ensureExists(id: string) {
    const record = await this.prisma.teamMember.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!record) {
      throw new NotFoundException('Team member not found');
    }
  }

  private async setActive(id: string, isActive: boolean) {
    await this.ensureExists(id);
    return this.prisma.teamMember.update({
      where: { id },
      data: { isActive },
    });
  }
}
