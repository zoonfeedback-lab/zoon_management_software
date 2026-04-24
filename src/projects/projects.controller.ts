import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RoleKey } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Projects')
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(RoleKey.ADMIN)
  @ApiOperation({
    summary: 'Create project (admin only)',
    description: 'Admin creates a new project and optionally assigns a project manager (must be TEAM_MEMBER role). The project manager will have access to the project through the project-manager portal.',
  })
  @ApiBody({
    type: CreateProjectDto,
    examples: {
      'with-project-manager': {
        summary: 'Project with assigned project manager',
        value: {
          name: 'Website Redesign',
          description: 'Complete redesign of company website',
          clientId: '550e8400-e29b-41d4-a716-446655440000',
          projectManagerId: '660e8400-e29b-41d4-a716-446655440000',
          startDate: '2026-05-01',
          deadline: '2026-07-01',
          memberIds: [
            '770e8400-e29b-41d4-a716-446655440000',
            '880e8400-e29b-41d4-a716-446655440000',
          ],
        },
      },
      'without-project-manager': {
        summary: 'Project without project manager',
        value: {
          name: 'Mobile App Development',
          description: 'New mobile application',
          clientId: '550e8400-e29b-41d4-a716-446655440000',
          startDate: '2026-06-01',
          deadline: '2026-12-01',
          memberIds: ['770e8400-e29b-41d4-a716-446655440000'],
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Project created successfully with project manager assigned.',
  })
  @ApiForbiddenResponse({ description: 'Only admins can create projects.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async create(@Body() dto: CreateProjectDto) {
    const data = await this.projectsService.create(dto);
    return { data };
  }

  @Get()
  @ApiOperation({
    summary: 'List all projects',
    description: 'Admin sees all projects. Team members see only projects they are members of. Project managers will also see their projects in the project-manager portal.',
  })
  @ApiOkResponse({ description: 'Returns all projects visible to the user.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.projectsService.findAll(user);
    return { data };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get project by id',
    description: 'Retrieve detailed information about a specific project including client, project manager, team members, and tasks.',
  })
  @ApiParam({
    name: 'id',
    description: 'Project id (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ description: 'Returns project details.' })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  @ApiForbiddenResponse({
    description:
      'You can only view projects you are assigned to (unless you are an admin).',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectsService.findOne(id, user);
    return { data };
  }

  @Patch(':id')
  @Roles(RoleKey.ADMIN)
  @ApiOperation({
    summary: 'Update project by id (admin only)',
    description: 'Update project details including name, status, dates, client, team members, and/or project manager assignment.',
  })
  @ApiParam({
    name: 'id',
    description: 'Project id (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: UpdateProjectDto,
    examples: {
      'update-project-manager': {
        summary: 'Change project manager',
        value: {
          projectManagerId: '660e8400-e29b-41d4-a716-446655440000',
        },
      },
      'update-status': {
        summary: 'Update project status',
        value: {
          status: 'ACTIVE',
        },
      },
      'add-team-members': {
        summary: 'Update team members',
        value: {
          memberIds: [
            '770e8400-e29b-41d4-a716-446655440000',
            '880e8400-e29b-41d4-a716-446655440000',
            '990e8400-e29b-41d4-a716-446655440000',
          ],
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Project updated successfully.' })
  @ApiForbiddenResponse({ description: 'Only admins can update projects.' })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectsService.update(id, dto, user);
    return { data };
  }
}
