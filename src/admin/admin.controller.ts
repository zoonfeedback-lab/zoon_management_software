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
import { AdminService } from './admin.service';
import { UpdateRevisionStatusDto } from './dto/update-revision-status.dto';
import { UpdateSupportRequestStatusDto } from './dto/update-support-request-status.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { CreateClientInviteDto } from '../auth/dto/create-client-invite.dto';
import { UpdateClientDto } from '../clients/dto/update-client.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleKey.ADMIN)
@ApiTags('Admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── REVISION REQUESTS ────────────────────────────────

  @Get('projects/:id/revisions')
  @ApiOperation({ summary: 'List revision requests for project (admin)' })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiOkResponse({ description: 'Returns revision requests for the project.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async listRevisions(@Param('id', new ParseUUIDPipe()) projectId: string) {
    const data = await this.adminService.listRevisions(projectId);
    return { data };
  }

  @Patch('revisions/:id')
  @ApiOperation({ summary: 'Update revision request status (admin)' })
  @ApiParam({ name: 'id', description: 'Revision request id (UUID)' })
  @ApiBody({ type: UpdateRevisionStatusDto })
  @ApiOkResponse({ description: 'Revision status updated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async updateRevisionStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRevisionStatusDto,
  ) {
    const data = await this.adminService.updateRevisionStatus(id, dto);
    return { data };
  }

  // ─── SUPPORT REQUESTS ─────────────────────────────────

  @Get('projects/:id/support-requests')
  @ApiOperation({ summary: 'List support requests for project (admin)' })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiOkResponse({ description: 'Returns support requests for the project.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async listSupportRequests(
    @Param('id', new ParseUUIDPipe()) projectId: string,
  ) {
    const data = await this.adminService.listSupportRequests(projectId);
    return { data };
  }

  @Patch('support-requests/:id')
  @ApiOperation({ summary: 'Update support request status (admin)' })
  @ApiParam({ name: 'id', description: 'Support request id (UUID)' })
  @ApiBody({ type: UpdateSupportRequestStatusDto })
  @ApiOkResponse({
    description: 'Support request status updated successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async updateSupportRequestStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSupportRequestStatusDto,
  ) {
    const data = await this.adminService.updateSupportRequestStatus(id, dto);
    return { data };
  }

  // ─── NOTIFICATIONS ────────────────────────────────────

  @Post('clients/:id/notifications')
  @ApiOperation({ summary: 'Send notification to client (admin)' })
  @ApiParam({ name: 'id', description: 'Client id (UUID)' })
  @ApiBody({ type: SendNotificationDto })
  @ApiOkResponse({ description: 'Notification sent successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async sendNotification(
    @Param('id', new ParseUUIDPipe()) clientId: string,
    @Body() dto: SendNotificationDto,
  ) {
    const data = await this.adminService.sendNotification(clientId, dto);
    return { data };
  }

  // ─── CLIENT MANAGEMENT ────────────────────────────────

  @Get('clients')
  @ApiTags('Clients')
  @ApiOperation({ summary: 'List all clients (admin)' })
  @ApiOkResponse({ description: 'Returns all clients with auth user status.' })
  async listClients() {
    const data = await this.adminService.listClients();
    return { data };
  }

  @Get('clients/:id')
  @ApiTags('Clients')
  @ApiOperation({ summary: 'Get client details by id (admin)' })
  @ApiParam({ name: 'id', description: 'Client id (UUID)' })
  @ApiOkResponse({ description: 'Returns client details.' })
  @ApiNotFoundResponse({ description: 'Client not found.' })
  async getClient(@Param('id', new ParseUUIDPipe()) id: string) {
    const data = await this.adminService.getClient(id);
    return { data };
  }

  @Post('clients/invite')
  @ApiTags('Clients')
  @ApiOperation({
    summary: 'Create client invite and send one-time setup email (admin)',
  })
  @ApiBody({ type: CreateClientInviteDto })
  @ApiCreatedResponse({ description: 'Client invite created and email sent.' })
  async createClientInvite(@Body() dto: CreateClientInviteDto) {
    return this.adminService.createClientInvite(dto);
  }

  @Patch('clients/:id')
  @ApiTags('Clients')
  @ApiOperation({ summary: 'Update client details (admin)' })
  @ApiParam({ name: 'id', description: 'Client id (UUID)' })
  @ApiBody({ type: UpdateClientDto })
  @ApiOkResponse({ description: 'Client updated successfully.' })
  async updateClient(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateClientDto,
  ) {
    const data = await this.adminService.updateClient(id, dto);
    return { data };
  }

  @Patch('clients/:id/deactivate')
  @ApiTags('Clients')
  @ApiOperation({ summary: 'Deactivate client account (admin)' })
  @ApiParam({ name: 'id', description: 'Client id (UUID)' })
  @ApiOkResponse({ description: 'Client deactivated successfully.' })
  async deactivateClient(@Param('id', new ParseUUIDPipe()) id: string) {
    const data = await this.adminService.deactivateClient(id);
    return { data };
  }

  @Post('clients/:id/resend-invite')
  @ApiTags('Clients')
  @ApiOperation({ summary: 'Resend setup email to existing client (admin)' })
  @ApiParam({ name: 'id', description: 'Client id (UUID)' })
  @ApiOkResponse({ description: 'Invite email resent successfully.' })
  async resendClientInvite(@Param('id', new ParseUUIDPipe()) id: string) {
    const data = await this.adminService.resendClientInvite(id);
    return { data };
  }

  @Post('clients/:id/revoke-sessions')
  @ApiTags('Clients')
  @ApiOperation({ summary: 'Revoke all sessions for a client (admin)' })
  @ApiParam({ name: 'id', description: 'Client id (UUID)' })
  @ApiOkResponse({ description: 'All sessions revoked successfully.' })
  async revokeClientSessions(@Param('id', new ParseUUIDPipe()) id: string) {
    const data = await this.adminService.revokeClientSessions(id);
    return { data };
  }
}
