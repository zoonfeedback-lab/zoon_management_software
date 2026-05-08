import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
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
import { InternshipApplicationsService } from './internship-applications.service';
import { CreateInternshipApplicationDto } from './dto/create-internship-application.dto';
import { UpdateInternshipApplicationDto } from './dto/update-internship-application.dto';

@Controller('internship-applications')
@ApiTags('Internship Applications')
export class InternshipApplicationsController {
  constructor(
    private readonly applicationsService: InternshipApplicationsService,
  ) {}

  // ─── PUBLIC: Submit Application ──────────────────────

  @Post()
  @ApiOperation({
    summary: 'Submit an internship application (public)',
    description:
      'Allows anyone to submit an internship application form. No authentication required.',
  })
  @ApiBody({ type: CreateInternshipApplicationDto })
  @ApiCreatedResponse({
    description: 'Application submitted successfully.',
  })
  @ApiConflictResponse({
    description: 'An application with this email already exists.',
  })
  async create(@Body() dto: CreateInternshipApplicationDto) {
    console.log('Received internship application:', JSON.stringify(dto, null, 2));
    const data = await this.applicationsService.create(dto);
    return { data };
  }

  // ─── ADMIN: List All Applications ────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleKey.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all internship applications (admin only)',
    description:
      'Returns all submitted internship applications, ordered by most recent first.',
  })
  @ApiOkResponse({
    description: 'Returns all internship applications.',
  })
  @ApiForbiddenResponse({
    description: 'Only admins can view applications.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findAll() {
    const data = await this.applicationsService.findAll();
    return { data };
  }

  // ─── ADMIN: Get Single Application ───────────────────

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleKey.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get internship application by id (admin only)',
    description:
      'Returns full details of a single internship application including skills and projects.',
  })
  @ApiParam({ name: 'id', description: 'Application id (UUID)' })
  @ApiOkResponse({
    description: 'Returns the internship application details.',
  })
  @ApiNotFoundResponse({ description: 'Application not found.' })
  @ApiForbiddenResponse({
    description: 'Only admins can view application details.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const data = await this.applicationsService.findOne(id);
    return { data };
  }

  // ─── PUBLIC: Full Update Application (PUT) ─────────

  @Put(':id')
  @ApiOperation({
    summary: 'Full update of an internship application (public)',
    description:
      'Replaces the entire internship application with the provided data. All fields should be provided. Skills and projects are replaced entirely.',
  })
  @ApiParam({ name: 'id', description: 'Application id (UUID)' })
  @ApiBody({ type: UpdateInternshipApplicationDto })
  @ApiOkResponse({
    description: 'Application updated successfully.',
  })
  @ApiNotFoundResponse({ description: 'Application not found.' })
  @ApiConflictResponse({
    description: 'An application with this email already exists.',
  })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateInternshipApplicationDto,
  ) {
    const data = await this.applicationsService.update(id, dto);
    return { data };
  }

  // ─── PUBLIC: Partial Update Application (PATCH) ──────

  @Patch(':id')
  @ApiOperation({
    summary: 'Partial update of an internship application (public)',
    description:
      'Updates only the provided fields of an internship application. Omitted fields remain unchanged. If skills or projects are provided, they replace the existing ones entirely.',
  })
  @ApiParam({ name: 'id', description: 'Application id (UUID)' })
  @ApiBody({ type: UpdateInternshipApplicationDto })
  @ApiOkResponse({
    description: 'Application partially updated successfully.',
  })
  @ApiNotFoundResponse({ description: 'Application not found.' })
  @ApiConflictResponse({
    description: 'An application with this email already exists.',
  })
  async partialUpdate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateInternshipApplicationDto,
  ) {
    const data = await this.applicationsService.partialUpdate(id, dto);
    return { data };
  }

  // ─── ADMIN: Delete Application ───────────────────────

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleKey.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete internship application (admin only)',
    description:
      'Permanently deletes an internship application and all associated skills/projects.',
  })
  @ApiParam({ name: 'id', description: 'Application id (UUID)' })
  @ApiOkResponse({
    description: 'Application deleted successfully.',
  })
  @ApiNotFoundResponse({ description: 'Application not found.' })
  @ApiForbiddenResponse({
    description: 'Only admins can delete applications.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    const data = await this.applicationsService.remove(id);
    return { data };
  }
}
