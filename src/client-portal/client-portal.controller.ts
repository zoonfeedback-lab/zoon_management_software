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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { CreateCommentDto } from '../comments/dto/create-comment.dto';
import { ClientPortalService } from './client-portal.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { CreateRevisionRequestDto } from './dto/create-revision-request.dto';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';

@Controller('client')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleKey.CLIENT)
@ApiTags('Client Portal')
@ApiBearerAuth()
export class ClientPortalController {
  constructor(private readonly clientPortalService: ClientPortalService) {}

  // ─── 2.1 CLIENT PROFILE ───────────────────────────────

  @Get('profile')
  @ApiOperation({ summary: 'Get client profile with project history' })
  @ApiOkResponse({ description: 'Returns client profile and project history.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.clientPortalService.getProfile(user);
    return { data };
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update limited client profile details' })
  @ApiBody({ type: UpdateClientProfileDto })
  @ApiOkResponse({ description: 'Profile updated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async updateProfile(
    @Body() dto: UpdateClientProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.clientPortalService.updateProfile(dto, user);
    return { data };
  }

  // ─── 2.2 CLIENT DASHBOARD ─────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Get client dashboard with metrics and updates' })
  @ApiOkResponse({
    description: 'Returns client dashboard metrics and updates.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async getDashboard(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.clientPortalService.getDashboard(user);
    return { data };
  }

  // ─── 2.3 PROJECT ACCESS ───────────────────────────────

  @Get('projects')
  @ApiOperation({ summary: 'List projects assigned to authenticated client' })
  @ApiOkResponse({ description: 'Returns client projects.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async listProjects(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.clientPortalService.listProjects(user);
    return { data };
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Get one assigned project' })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiOkResponse({ description: 'Returns project details.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async getProject(
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.clientPortalService.getProject(projectId, user);
    return { data };
  }

  // ─── 2.4 TASK VISIBILITY ──────────────────────────────

  @Get('projects/:id/tasks')
  @ApiOperation({ summary: 'Get task visibility for assigned project' })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiOkResponse({ description: 'Returns limited task list for the project.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async getProjectTasks(
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.clientPortalService.getProjectTasks(
      projectId,
      user,
    );
    return { data };
  }

  // ─── 2.5 COMMUNICATION ────────────────────────────────

  @Post('tasks/:id/comments')
  @ApiOperation({ summary: 'Add feedback comment to a task from client side' })
  @ApiParam({ name: 'id', description: 'Task id (UUID)' })
  @ApiBody({ type: CreateCommentDto })
  @ApiOkResponse({ description: 'Comment created successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async createTaskComment(
    @Param('id', new ParseUUIDPipe()) taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.clientPortalService.createTaskComment(
      taskId,
      dto.content,
      user,
    );
    return { data };
  }

  @Get('tasks/:id/comments')
  @ApiOperation({ summary: 'View discussion history for a task' })
  @ApiParam({ name: 'id', description: 'Task id (UUID)' })
  @ApiOkResponse({ description: 'Returns comment history for the task.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async getTaskComments(
    @Param('id', new ParseUUIDPipe()) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.clientPortalService.getTaskComments(taskId, user);
    return { data };
  }

  // ─── 2.6 REVISION REQUESTS ────────────────────────────

  @Post('projects/:id/revisions')
  @ApiOperation({ summary: 'Submit a revision request for project' })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiBody({ type: CreateRevisionRequestDto })
  @ApiOkResponse({ description: 'Revision request submitted.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async createRevision(
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateRevisionRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.clientPortalService.createRevision(
      projectId,
      dto,
      user,
    );
    return { data };
  }

  @Get('projects/:id/revisions')
  @ApiOperation({ summary: 'View revision request history for project' })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiOkResponse({ description: 'Returns revision requests for the project.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async getRevisions(
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.clientPortalService.getRevisions(projectId, user);
    return { data };
  }

  // ─── 2.7 APPROVAL SYSTEM ──────────────────────────────

  @Post('projects/:id/approvals')
  @ApiOperation({ summary: 'Submit deliverable/project approval' })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiBody({ type: CreateApprovalDto })
  @ApiOkResponse({ description: 'Approval submitted.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async createApproval(
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateApprovalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.clientPortalService.createApproval(
      projectId,
      dto,
      user,
    );
    return { data };
  }

  @Get('projects/:id/approvals')
  @ApiOperation({ summary: 'View approval history for project' })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiOkResponse({ description: 'Returns approvals for the project.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async getApprovals(
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.clientPortalService.getApprovals(projectId, user);
    return { data };
  }

  // ─── 2.8 DELIVERABLES ACCESS ──────────────────────────

  @Get('projects/:id/deliverables')
  @ApiOperation({ summary: 'View deliverables for assigned project' })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiOkResponse({ description: 'Returns deliverables for the project.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async getDeliverables(
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.clientPortalService.getDeliverables(
      projectId,
      user,
    );
    return { data };
  }

  // ─── 2.9 NOTIFICATIONS ────────────────────────────────

  @Get('notifications')
  @ApiOperation({ summary: 'Get client notifications' })
  @ApiOkResponse({ description: 'Returns all client notifications.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async getNotifications(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.clientPortalService.getNotifications(user);
    return { data };
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification id (UUID)' })
  @ApiOkResponse({ description: 'Notification marked as read.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async markNotificationRead(
    @Param('id', new ParseUUIDPipe()) notificationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.clientPortalService.markNotificationRead(
      notificationId,
      user,
    );
    return { data };
  }

  @Post('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiOkResponse({ description: 'All notifications marked as read.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async markAllNotificationsRead(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.clientPortalService.markAllNotificationsRead(user);
    return { data };
  }

  // ─── 2.10 FEEDBACK SYSTEM ─────────────────────────────

  @Post('projects/:id/feedback')
  @ApiOperation({ summary: 'Submit project feedback (one-time per project)' })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiBody({ type: CreateFeedbackDto })
  @ApiOkResponse({ description: 'Feedback submitted.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async createFeedback(
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateFeedbackDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.clientPortalService.createFeedback(
      projectId,
      dto,
      user,
    );
    return { data };
  }

  @Get('projects/:id/feedback')
  @ApiOperation({ summary: 'View submitted feedback for project' })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiOkResponse({ description: 'Returns feedback for the project.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async getFeedback(
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.clientPortalService.getFeedback(projectId, user);
    return { data };
  }

  // ─── 2.11 POST-DELIVERY SUPPORT ───────────────────────

  @Post('projects/:id/support-requests')
  @ApiOperation({
    summary: 'Submit post-delivery support request (15-day window)',
  })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiBody({ type: CreateSupportRequestDto })
  @ApiOkResponse({ description: 'Support request submitted.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async createSupportRequest(
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateSupportRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.clientPortalService.createSupportRequest(
      projectId,
      dto,
      user,
    );
    return { data };
  }

  @Get('projects/:id/support-requests')
  @ApiOperation({ summary: 'View support requests for project' })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiOkResponse({ description: 'Returns support requests for the project.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async getSupportRequests(
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.clientPortalService.getSupportRequests(
      projectId,
      user,
    );
    return { data };
  }
}
