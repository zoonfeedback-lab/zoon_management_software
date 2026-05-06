import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SkillProficiency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInternshipApplicationDto } from './dto/create-internship-application.dto';
import { UpdateInternshipApplicationDto } from './dto/update-internship-application.dto';

const applicationFullSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  universityName: true,
  degreeProgram: true,
  currentSemester: true,
  confidentAreas: true,
  toolsUsed: true,
  mostConfidentTool: true,
  mostConfidentToolReason: true,
  hasProjects: true,
  problemSolvingAnswer: true,
  createdAt: true,
  updatedAt: true,
  skills: {
    select: {
      id: true,
      skillName: true,
      proficiency: true,
    },
  },
  projects: {
    select: {
      id: true,
      title: true,
      role: true,
      technologies: true,
      link: true,
    },
  },
} as const;

@Injectable()
export class InternshipApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInternshipApplicationDto) {
    try {
      return await this.prisma.internshipApplication.create({
        data: {
          fullName: dto.fullName.trim(),
          email: dto.email.toLowerCase().trim(),
          phone: dto.phone.trim(),
          universityName: dto.universityName.trim(),
          degreeProgram: dto.degreeProgram.trim(),
          currentSemester: dto.currentSemester.trim(),
          confidentAreas: dto.confidentAreas,
          toolsUsed: dto.toolsUsed,
          mostConfidentTool: dto.mostConfidentTool.trim(),
          mostConfidentToolReason: dto.mostConfidentToolReason.trim(),
          hasProjects: dto.hasProjects,
          problemSolvingAnswer: dto.problemSolvingAnswer.trim(),
          skills: {
            create: (dto.skills ?? []).map((s) => ({
              skillName: s.skillName.trim(),
              proficiency:
                (s.proficiency as SkillProficiency) ??
                SkillProficiency.BEGINNER,
            })),
          },
          projects: {
            create: dto.hasProjects
              ? (dto.projects ?? []).map((p) => ({
                  title: p.title.trim(),
                  role: p.role.trim(),
                  technologies: p.technologies.trim(),
                  link: p.link?.trim() ?? null,
                }))
              : [],
          },
        },
        select: applicationFullSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An application with this email already exists',
        );
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.internshipApplication.findMany({
      select: applicationFullSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const application = await this.prisma.internshipApplication.findUnique({
      where: { id },
      select: applicationFullSelect,
    });
    if (!application) {
      throw new NotFoundException('Internship application not found');
    }
    return application;
  }

  // ─── Full Update (PUT) ──────────────────────────────

  async update(id: string, dto: UpdateInternshipApplicationDto) {
    const existing = await this.prisma.internshipApplication.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Internship application not found');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Delete existing skills and projects, then recreate
        await tx.applicantSkill.deleteMany({ where: { applicationId: id } });
        await tx.applicantProject.deleteMany({ where: { applicationId: id } });

        return tx.internshipApplication.update({
          where: { id },
          data: {
            fullName: dto.fullName?.trim(),
            email: dto.email?.toLowerCase().trim(),
            phone: dto.phone?.trim(),
            universityName: dto.universityName?.trim(),
            degreeProgram: dto.degreeProgram?.trim(),
            currentSemester: dto.currentSemester?.trim(),
            confidentAreas: dto.confidentAreas,
            toolsUsed: dto.toolsUsed,
            mostConfidentTool: dto.mostConfidentTool?.trim(),
            mostConfidentToolReason: dto.mostConfidentToolReason?.trim(),
            hasProjects: dto.hasProjects,
            problemSolvingAnswer: dto.problemSolvingAnswer?.trim(),
            skills: {
              create: (dto.skills ?? []).map((s) => ({
                skillName: s.skillName.trim(),
                proficiency:
                  (s.proficiency as SkillProficiency) ??
                  SkillProficiency.BEGINNER,
              })),
            },
            projects: {
              create: dto.hasProjects
                ? (dto.projects ?? []).map((p) => ({
                    title: p.title.trim(),
                    role: p.role.trim(),
                    technologies: p.technologies.trim(),
                    link: p.link?.trim() ?? null,
                  }))
                : [],
            },
          },
          select: applicationFullSelect,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An application with this email already exists',
        );
      }
      throw error;
    }
  }

  // ─── Partial Update (PATCH) ─────────────────────────

  async partialUpdate(id: string, dto: UpdateInternshipApplicationDto) {
    const existing = await this.prisma.internshipApplication.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Internship application not found');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const data: Record<string, unknown> = {};

        if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
        if (dto.email !== undefined)
          data.email = dto.email.toLowerCase().trim();
        if (dto.phone !== undefined) data.phone = dto.phone.trim();
        if (dto.universityName !== undefined)
          data.universityName = dto.universityName.trim();
        if (dto.degreeProgram !== undefined)
          data.degreeProgram = dto.degreeProgram.trim();
        if (dto.currentSemester !== undefined)
          data.currentSemester = dto.currentSemester.trim();
        if (dto.confidentAreas !== undefined)
          data.confidentAreas = dto.confidentAreas;
        if (dto.toolsUsed !== undefined) data.toolsUsed = dto.toolsUsed;
        if (dto.mostConfidentTool !== undefined)
          data.mostConfidentTool = dto.mostConfidentTool.trim();
        if (dto.mostConfidentToolReason !== undefined)
          data.mostConfidentToolReason = dto.mostConfidentToolReason.trim();
        if (dto.hasProjects !== undefined) data.hasProjects = dto.hasProjects;
        if (dto.problemSolvingAnswer !== undefined)
          data.problemSolvingAnswer = dto.problemSolvingAnswer.trim();

        // Replace skills only if provided
        if (dto.skills !== undefined) {
          await tx.applicantSkill.deleteMany({ where: { applicationId: id } });
          data.skills = {
            create: dto.skills.map((s) => ({
              skillName: s.skillName.trim(),
              proficiency:
                (s.proficiency as SkillProficiency) ??
                SkillProficiency.BEGINNER,
            })),
          };
        }

        // Replace projects only if provided
        if (dto.projects !== undefined) {
          await tx.applicantProject.deleteMany({
            where: { applicationId: id },
          });
          data.projects = {
            create: dto.projects.map((p) => ({
              title: p.title.trim(),
              role: p.role.trim(),
              technologies: p.technologies.trim(),
              link: p.link?.trim() ?? null,
            })),
          };
        }

        return tx.internshipApplication.update({
          where: { id },
          data,
          select: applicationFullSelect,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An application with this email already exists',
        );
      }
      throw error;
    }
  }

  async remove(id: string) {
    const exists = await this.prisma.internshipApplication.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Internship application not found');
    }
    await this.prisma.internshipApplication.delete({ where: { id } });
    return { message: 'Internship application deleted successfully' };
  }
}
