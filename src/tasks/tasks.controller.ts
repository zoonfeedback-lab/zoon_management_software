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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Tasks')
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('tasks')
  @Roles(RoleKey.ADMIN, RoleKey.TEAM_MEMBER)
  @ApiOperation({ summary: 'Create task (admin and project managers only)' })
  @ApiBody({ type: CreateTaskDto })
  @ApiCreatedResponse({ description: 'Task created successfully.' })
  @ApiForbiddenResponse({ description: 'Only admins and project managers can create tasks.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async create(@Body() dto: CreateTaskDto) {
    const data = await this.tasksService.create(dto);
    return { data };
  }

  @Get('tasks')
  @ApiOperation({ summary: 'List tasks visible to current user' })
  @ApiOkResponse({ description: 'Returns tasks for the current user scope.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.tasksService.findAll(user);
    return { data };
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get task by id' })
  @ApiParam({ name: 'id', description: 'Task id (UUID)' })
  @ApiOkResponse({ description: 'Returns task details.' })
  @ApiNotFoundResponse({ description: 'Task not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.tasksService.findOne(id, user);
    return { data };
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update task by id' })
  @ApiParam({ name: 'id', description: 'Task id (UUID)' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiOkResponse({ description: 'Task updated successfully.' })
  @ApiForbiddenResponse({ description: 'You are not allowed to update this task.' })
  @ApiNotFoundResponse({ description: 'Task not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.tasksService.update(id, dto, user);
    return { data };
  }

  @Get('projects/:id/tasks')
  @ApiOperation({ summary: 'List tasks by project id' })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiOkResponse({ description: 'Returns tasks for the project.' })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findByProject(
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.tasksService.findByProject(projectId, user);
    return { data };
  }

  @Get('users/:id/tasks')
  @ApiOperation({ summary: 'List tasks by user id' })
  @ApiParam({ name: 'id', description: 'User id (UUID)' })
  @ApiOkResponse({ description: 'Returns tasks for the user.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findByUser(
    @Param('id', new ParseUUIDPipe()) userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.tasksService.findByUser(userId, user);
    return { data };
  }
}
