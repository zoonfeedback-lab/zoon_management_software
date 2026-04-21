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
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('tasks')
  @Roles(RoleKey.ADMIN)
  async create(@Body() dto: CreateTaskDto) {
    const data = await this.tasksService.create(dto);
    return { data };
  }

  @Get('tasks')
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.tasksService.findAll(user);
    return { data };
  }

  @Get('tasks/:id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.tasksService.findOne(id, user);
    return { data };
  }

  @Patch('tasks/:id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.tasksService.update(id, dto, user);
    return { data };
  }

  @Get('projects/:id/tasks')
  async findByProject(
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.tasksService.findByProject(projectId, user);
    return { data };
  }

  @Get('users/:id/tasks')
  async findByUser(
    @Param('id', new ParseUUIDPipe()) userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.tasksService.findByUser(userId, user);
    return { data };
  }
}
