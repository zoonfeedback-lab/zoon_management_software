import {
  Body,
  Controller,
  Delete,
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
  @Roles(RoleKey.ADMIN, RoleKey.CORE_TEAM)
  @ApiOperation({
    summary: 'Create task (admin and project managers only)',
    description:
      'Create a new task and optionally attach documents or images. ' +
      'The frontend should upload files to Cloudinary first and pass the resulting URLs.',
  })
  @ApiBody({ type: CreateTaskDto })
  @ApiCreatedResponse({ description: 'Task created successfully.' })
  @ApiForbiddenResponse({ description: 'Only admins and project managers can create tasks.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.tasksService.create(dto, user.id);
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
  @ApiOkResponse({ description: 'Returns task details with attachments.' })
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
  @ApiOperation({
    summary: 'Update task by id',
    description:
      'Update task fields and optionally append new attachments. ' +
      'Provided attachments are added to the existing set (not replaced).',
  })
  @ApiParam({ name: 'id', description: 'Task id (UUID)' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiOkResponse({ description: 'Task updated successfully.' })
  @ApiForbiddenResponse({
    description: 'You are not allowed to update this task.',
  })
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

  @Get('employees/:id/tasks')
  @ApiOperation({ summary: 'List tasks by employee id' })
  @ApiParam({ name: 'id', description: 'Employee id (UUID)' })
  @ApiOkResponse({ description: 'Returns tasks for the user.' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findByUser(
    @Param('id', new ParseUUIDPipe()) userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.tasksService.findByUser(userId, user);
    return { data };
  }

  // ─── TASK ATTACHMENTS ────────────────────────────────

  @Get('tasks/:id/attachments')
  @ApiOperation({ summary: 'List all attachments for a task' })
  @ApiParam({ name: 'id', description: 'Task id (UUID)' })
  @ApiOkResponse({ description: 'Returns attachments for the task.' })
  @ApiNotFoundResponse({ description: 'Task not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async getAttachments(
    @Param('id', new ParseUUIDPipe()) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.tasksService.getTaskAttachments(taskId, user);
    return { data };
  }

  @Delete('tasks/:taskId/attachments/:attachmentId')
  @Roles(RoleKey.ADMIN, RoleKey.CORE_TEAM)
  @ApiOperation({
    summary: 'Delete a task attachment',
    description: 'Remove an attachment from a task. Allowed for admins, the uploader, or the project manager.',
  })
  @ApiParam({ name: 'taskId', description: 'Task id (UUID)' })
  @ApiParam({ name: 'attachmentId', description: 'Attachment id (UUID)' })
  @ApiOkResponse({ description: 'Attachment deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Attachment not found.' })
  @ApiForbiddenResponse({ description: 'You are not allowed to delete this attachment.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async deleteAttachment(
    @Param('attachmentId', new ParseUUIDPipe()) attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.tasksService.deleteAttachment(attachmentId, user);
    return { data };
  }
}
