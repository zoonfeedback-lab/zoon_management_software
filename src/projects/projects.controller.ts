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
  @ApiOperation({ summary: 'Create project (admin only)' })
  @ApiBody({ type: CreateProjectDto })
  @ApiOkResponse({ description: 'Project created successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async create(@Body() dto: CreateProjectDto) {
    const data = await this.projectsService.create(dto);
    return { data };
  }

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  @ApiOkResponse({ description: 'Returns all projects.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findAll() {
    const data = await this.projectsService.findAll();
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by id' })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiOkResponse({ description: 'Returns project details.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const data = await this.projectsService.findOne(id);
    return { data };
  }

  @Patch(':id')
  @Roles(RoleKey.ADMIN)
  @ApiOperation({ summary: 'Update project by id (admin only)' })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiBody({ type: UpdateProjectDto })
  @ApiOkResponse({ description: 'Project updated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const data = await this.projectsService.update(id, dto);
    return { data };
  }
}
