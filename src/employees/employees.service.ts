import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleKey } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

const employeePublicSelect = {
  id: true,
  email: true,
  fullName: true,
  isActive: true,
  phone: true,
  jobTitle: true,
  department: true,
  experienceLevel: true,
  skills: true,
  availabilityStatus: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { key: true, name: true } },
} as const;

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEmployeeDto) {
    const role = await this.prisma.role.findUnique({
      where: { key: dto.role as RoleKey },
      select: { id: true },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    try {
      const passwordHash = await bcrypt.hash(dto.password, 10);
      return await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          fullName: dto.fullName.trim(),
          roleId: role.id,
          phone: dto.phone?.trim() ?? null,
          jobTitle: dto.jobTitle?.trim() ?? null,
          department: dto.department?.trim() ?? null,
          experienceLevel: dto.experienceLevel?.trim() ?? null,
          skills: dto.skills ?? [],
          availabilityStatus: dto.availabilityStatus,
        },
        select: employeePublicSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Employee email already exists');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: {
        role: { key: { in: [RoleKey.INTERNEE, RoleKey.CORE_TEAM] } },
      },
      select: employeePublicSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(employeeId: string, requester: AuthenticatedUser) {
    if (requester.role !== RoleKey.ADMIN && requester.id !== employeeId) {
      throw new ForbiddenException('You can only view your own profile');
    }
    return this.getEmployeeByIdOrThrow(employeeId);
  }

  async update(
    employeeId: string,
    dto: UpdateEmployeeDto,
    requester: AuthenticatedUser,
  ) {
    if (requester.role !== RoleKey.ADMIN && requester.id !== employeeId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const updated = await this.prisma.user.update({
      where: { id: employeeId },
      data: {
        fullName: dto.fullName?.trim(),
        phone: dto.phone?.trim(),
        jobTitle: dto.jobTitle?.trim(),
        department: dto.department?.trim(),
        experienceLevel: dto.experienceLevel?.trim(),
        skills: dto.skills,
        availabilityStatus: dto.availabilityStatus,
        isActive: requester.role === RoleKey.ADMIN ? dto.isActive : undefined,
      },
      select: employeePublicSelect,
    });

    return updated;
  }

  private async getEmployeeByIdOrThrow(id: string) {
    const employee = await this.prisma.user.findUnique({
      where: { id },
      select: employeePublicSelect,
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }
}
