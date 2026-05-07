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
import { CreateInternDto } from './dto/create-intern.dto';
import { UpdateInternDto } from './dto/update-intern.dto';
import { InternsService } from './interns.service';

@Controller('interns')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Interns')
@ApiBearerAuth()
export class InternsController {
  constructor(private readonly internsService: InternsService) {}

  @Post()
  @Roles(RoleKey.ADMIN)
  @ApiOperation({ summary: 'Create a new intern (admin only)' })
  @ApiBody({ type: CreateInternDto })
  @ApiCreatedResponse({ description: 'Intern created successfully.' })
  @ApiForbiddenResponse({ description: 'Only admins can create interns.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async create(@Body() dto: CreateInternDto) {
    const data = await this.internsService.create(dto);
    return { data };
  }

  @Get()
  @Roles(RoleKey.ADMIN)
  @ApiOperation({ summary: 'List all interns (admin only)' })
  @ApiOkResponse({ description: 'Returns all interns.' })
  @ApiForbiddenResponse({ description: 'Only admins can list all interns.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findAll() {
    const data = await this.internsService.findAll();
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get intern by id' })
  @ApiParam({ name: 'id', description: 'Intern id (UUID)' })
  @ApiOkResponse({ description: 'Returns intern details.' })
  @ApiNotFoundResponse({ description: 'Intern not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.internsService.findOne(id, user);
    return { data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update intern by id' })
  @ApiParam({ name: 'id', description: 'Intern id (UUID)' })
  @ApiBody({ type: UpdateInternDto })
  @ApiOkResponse({ description: 'Intern updated successfully.' })
  @ApiForbiddenResponse({
    description: 'You can update only allowed intern records.',
  })
  @ApiNotFoundResponse({ description: 'Intern not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateInternDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.internsService.update(id, dto, user);
    return { data };
  }
}
