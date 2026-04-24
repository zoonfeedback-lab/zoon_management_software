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
import { ProjectManagerService } from './project-manager.service';
import { TaskRevisionService } from './task-revision.service';
import { CreateTaskRevisionDto } from './dto/create-task-revision.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { AddTeamMemberDto, RejectRevisionDto } from './dto/project-manager.dto';

@Controller('project-manager')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleKey.TEAM_MEMBER)
@ApiTags('Project Manager Portal')
@ApiBearerAuth()
export class ProjectManagerController {
  constructor(
    private readonly projectManagerService: ProjectManagerService,
    private readonly taskRevisionService: TaskRevisionService,
  ) {}

  // ─── PROJECT MANAGEMENT ─────────────────────────────

  @Get('projects')
  @ApiOperation({
    summary: 'Get all projects managed by current user',
    description:
      'Retrieve list of all projects where the current user is assigned as the project manager. Only active projects are returned.',
  })
  @ApiOkResponse({
    description: 'List of managed projects with team members and task counts.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({
    description: 'Only team members can access the project manager portal.',
  })
  async getManagedProjects(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.projectManagerService.getManagedProjects(user);
    return { data };
  }

  @Get('projects/:projectId')
  @ApiOperation({
    summary: 'Get a specific managed project',
    description:
      'Retrieve detailed information about a project you manage, including client, team members, and all tasks.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ description: 'Project details with full team and tasks.' })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  @ApiForbiddenResponse({
    description: 'You are not the manager of this project.',
  })
  async getManagedProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectManagerService.getManagedProject(projectId, user);
    return { data };
  }

  // ─── TEAM MEMBER MANAGEMENT ─────────────────────────

  @Get('projects/:projectId/team')
  @ApiOperation({
    summary: 'Get team members for a project',
    description:
      'Retrieve all team members assigned to a project you manage. Includes member details, join date, and roles.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'List of team members with their details and assignment information.',
  })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  @ApiForbiddenResponse({
    description: 'You are not the manager of this project.',
  })
  async getProjectTeam(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectManagerService.getProjectTeam(projectId, user);
    return { data };
  }

  @Post('projects/:projectId/team')
  @ApiOperation({
    summary: 'Add a team member to a project',
    description:
      'Add a new team member to your project. The member must be an active employee with the TEAM_MEMBER role. A team member can only be added to one project at a time.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: AddTeamMemberDto,
    examples: {
      example1: {
        value: {
          memberId: '550e8400-e29b-41d4-a716-446655440001',
        },
        description: 'Add a team member by their user ID',
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Team member successfully added to the project.',
  })
  @ApiNotFoundResponse({ description: 'Project or team member not found.' })
  @ApiForbiddenResponse({
    description: 'You are not the manager of this project, or member is not eligible to join.',
  })
  async addTeamMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: AddTeamMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectManagerService.addTeamMember(projectId, dto.memberId, user);
    return { data };
  }

  @Delete('projects/:projectId/team/:memberId')
  @ApiOperation({
    summary: 'Remove a team member from a project',
    description:
      'Remove a team member from your project. All tasks assigned to this member will be unassigned.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'memberId',
    description: 'Team member user ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiOkResponse({
    description: 'Team member successfully removed from the project.',
  })
  @ApiNotFoundResponse({
    description: 'Project or team member not found.',
  })
  @ApiForbiddenResponse({
    description: 'You are not the manager of this project.',
  })
  async removeTeamMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectManagerService.removeTeamMember(projectId, memberId, user);
    return { data };
  }

  // ─── TASK MANAGEMENT ────────────────────────────────

  @Get('projects/:projectId/tasks')
  @ApiOperation({
    summary: 'Get all tasks for a project',
    description:
      'Retrieve all tasks in a project you manage. Shows task status, assigned members, deadlines, and revision information.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'List of all project tasks with details and assignment info.',
  })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  @ApiForbiddenResponse({
    description: 'You are not the manager of this project.',
  })
  async getProjectTasks(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectManagerService.getProjectTasks(projectId, user);
    return { data };
  }

  @Get('projects/:projectId/tasks/:taskId')
  @ApiOperation({
    summary: 'Get a specific task',
    description:
      'Retrieve detailed information about a specific task including assignment, status, revisions, and timeline.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Task ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiOkResponse({ description: 'Task details with assignment and revision history.' })
  @ApiNotFoundResponse({ description: 'Project or task not found.' })
  @ApiForbiddenResponse({
    description: 'You are not the manager of this project.',
  })
  async getTask(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectManagerService.getTask(taskId, projectId, user);
    return { data };
  }

  @Patch('projects/:projectId/tasks/:taskId/assign')
  @ApiOperation({
    summary: 'Assign a task to a team member',
    description:
      'Assign a task to one of your team members. Only unassigned or previously assigned tasks can be reassigned.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Task ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiBody({
    type: AssignTaskDto,
    examples: {
      example1: {
        value: {
          assignedToId: '550e8400-e29b-41d4-a716-446655440001',
        },
        description: 'Assign task to a specific team member',
      },
    },
  })
  @ApiOkResponse({
    description: 'Task successfully assigned to the team member.',
  })
  @ApiNotFoundResponse({
    description: 'Project or team member not found.',
  })
  @ApiForbiddenResponse({
    description: 'You are not the manager of this project or member is not on your team.',
  })
  async assignTask(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: AssignTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectManagerService.assignTask(taskId, projectId, dto.memberId, user);
    return { data };
  }

  // ─── TASK REVISIONS ─────────────────────────────────

  @Post('projects/:projectId/tasks/:taskId/revisions')
  @ApiOperation({
    summary: 'Create a task revision (send feedback)',
    description:
      'Create a revision/feedback entry for a completed task. This notifies the team member to make updates based on your feedback. The task must be in DONE status.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Task ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiBody({
    type: CreateTaskRevisionDto,
    examples: {
      example1: {
        value: {
          feedback: 'Please adjust the button colors to match the brand guidelines. Use #007BFF instead of #0056B3.',
        },
        description: 'Create revision with detailed feedback',
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Revision successfully created and sent to team member.',
  })
  @ApiNotFoundResponse({
    description: 'Project or task not found.',
  })
  @ApiForbiddenResponse({
    description: 'You are not the manager of this project or task is not in DONE status.',
  })
  async createRevision(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateTaskRevisionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.taskRevisionService.createRevision(taskId, projectId, dto, user);
    return { data };
  }

  @Get('projects/:projectId/tasks/:taskId/revisions')
  @ApiOperation({
    summary: 'Get all revisions for a task',
    description:
      'Retrieve the complete revision history for a task including all feedback, approvals, and rejections.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Task ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiOkResponse({
    description: 'List of all revisions with feedback, status, and timestamps.',
  })
  @ApiNotFoundResponse({
    description: 'Project or task not found.',
  })
  @ApiForbiddenResponse({
    description: 'You are not the manager of this project.',
  })
  async getTaskRevisions(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.taskRevisionService.getTaskRevisions(taskId, projectId, user);
    return { data };
  }

  @Patch('revisions/:revisionId/approve')
  @ApiOperation({
    summary: 'Approve a task revision',
    description:
      'Approve a pending revision. This marks the feedback as approved and updates the task status accordingly.',
  })
  @ApiParam({
    name: 'revisionId',
    description: 'Revision ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @ApiOkResponse({
    description: 'Revision successfully approved.',
  })
  @ApiNotFoundResponse({
    description: 'Revision not found.',
  })
  @ApiForbiddenResponse({
    description: 'You are not authorized to approve this revision.',
  })
  async approveRevision(
    @Param('revisionId', ParseUUIDPipe) revisionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Extract projectId from query or body if needed
    // For now, we'll need to refactor this endpoint
    const data = await this.taskRevisionService.approveRevision(revisionId, '', user);
    return { data };
  }

  @Patch('revisions/:revisionId/reject')
  @ApiOperation({
    summary: 'Reject a task revision and request changes',
    description:
      'Reject a revision and provide additional feedback. This requests the team member to make further changes.',
  })
  @ApiParam({
    name: 'revisionId',
    description: 'Revision ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @ApiBody({
    type: RejectRevisionDto,
    examples: {
      example1: {
        value: {
          feedback: 'The changes look good but we need to adjust the spacing. Please review the design specs again.',
        },
        description: 'Reject with additional feedback',
      },
    },
  })
  @ApiOkResponse({
    description: 'Revision successfully rejected with feedback.',
  })
  @ApiNotFoundResponse({
    description: 'Revision not found.',
  })
  @ApiForbiddenResponse({
    description: 'You are not authorized to reject this revision.',
  })
  async rejectRevision(
    @Param('revisionId', ParseUUIDPipe) revisionId: string,
    @Body() dto: RejectRevisionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Extract projectId from query or body if needed
    const data = await this.taskRevisionService.rejectRevision(revisionId, '', dto.feedback, user);
    return { data };
  }

  // ─── TEAM MEMBER DASHBOARD ──────────────────────────

  @Get('my-tasks')
  @Roles(RoleKey.TEAM_MEMBER)
  @ApiOperation({
    summary: 'Get all tasks assigned to current user',
    description:
      'Retrieve all tasks assigned to you across all projects. Shows task status, project info, and revision requirements.',
  })
  @ApiOkResponse({ description: 'List of assigned tasks' })
  async getAssignedTasks(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.projectManagerService.getAssignedTasks(user);
    return { data };
  }
}
