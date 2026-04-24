import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleKey } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClientDto) {
    if (dto.authUserId) {
      await this.ensureClientRoleUser(dto.authUserId);
    }

    try {
      return await this.prisma.client.create({
        data: {
          companyName: dto.companyName.trim(),
          contactPerson: dto.contactPerson.trim(),
          email: dto.email.toLowerCase().trim(),
          phone: dto.phone?.trim() ?? null,
          authUserId: dto.authUserId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Client email already exists');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.ensureExists(id);
    if (dto.authUserId) {
      await this.ensureClientRoleUser(dto.authUserId);
    }
    try {
      return await this.prisma.client.update({
        where: { id },
        data: {
          companyName: dto.companyName?.trim(),
          contactPerson: dto.contactPerson?.trim(),
          email: dto.email?.toLowerCase().trim(),
          phone: dto.phone?.trim(),
          authUserId: dto.authUserId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Client email already exists');
      }
      throw error;
    }
  }

  private async ensureExists(id: string) {
    const record = await this.prisma.client.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!record) {
      throw new NotFoundException('Client not found');
    }
  }

  private async ensureClientRoleUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: { select: { key: true } } },
    });
    if (!user) {
      throw new NotFoundException('Linked user not found');
    }
    if (user.role.key !== RoleKey.CLIENT) {
      throw new ForbiddenException('Linked user must have CLIENT role');
    }
  }
}
