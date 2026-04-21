import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClientDto) {
    try {
      return await this.prisma.client.create({
        data: {
          companyName: dto.companyName.trim(),
          contactPerson: dto.contactPerson.trim(),
          email: dto.email.toLowerCase().trim(),
          phone: dto.phone?.trim() ?? null,
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

  async update(id: string, dto: UpdateClientDto) {
    await this.ensureExists(id);
    try {
      return await this.prisma.client.update({
        where: { id },
        data: {
          companyName: dto.companyName?.trim(),
          contactPerson: dto.contactPerson?.trim(),
          email: dto.email?.toLowerCase().trim(),
          phone: dto.phone?.trim(),
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

  async deactivate(id: string) {
    return this.setActive(id, false);
  }

  async reactivate(id: string) {
    return this.setActive(id, true);
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

  private async setActive(id: string, isActive: boolean) {
    await this.ensureExists(id);
    return this.prisma.client.update({
      where: { id },
      data: { isActive },
    });
  }
}
