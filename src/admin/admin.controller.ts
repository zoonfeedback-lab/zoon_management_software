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
import { AdminService } from './admin.service';
import { UpdateRevisionStatusDto } from './dto/update-revision-status.dto';
import { UpdateSupportRequestStatusDto } from './dto/update-support-request-status.dto';
import { SendNotificationDto } from './dto/send-notification.dto';

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
}
