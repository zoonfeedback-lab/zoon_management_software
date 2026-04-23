import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { DeliverablesService } from './deliverables.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Deliverables')
@ApiBearerAuth()
export class DeliverablesController {
  constructor(private readonly deliverablesService: DeliverablesService) {}

  @Post('projects/:id/deliverables')
  @Roles(RoleKey.ADMIN)
  @ApiOperation({ summary: 'Create deliverable for project (admin only)' })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiBody({ type: CreateDeliverableDto })
  @ApiOkResponse({ description: 'Deliverable created successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async create(
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateDeliverableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    dto.projectId = projectId;
    const data = await this.deliverablesService.create(dto, user.id);
    return { data };
  }

  @Get('projects/:id/deliverables')
  @Roles(RoleKey.ADMIN)
  @ApiOperation({ summary: 'List deliverables for project (admin only)' })
  @ApiParam({ name: 'id', description: 'Project id (UUID)' })
  @ApiOkResponse({ description: 'Returns deliverables for the project.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findByProject(@Param('id', new ParseUUIDPipe()) projectId: string) {
    const data = await this.deliverablesService.findByProject(projectId);
    return { data };
  }

  @Delete('deliverables/:id')
  @Roles(RoleKey.ADMIN)
  @ApiOperation({ summary: 'Delete deliverable (admin only)' })
  @ApiParam({ name: 'id', description: 'Deliverable id (UUID)' })
  @ApiOkResponse({ description: 'Deliverable deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    const data = await this.deliverablesService.remove(id);
    return { data };
  }
}
