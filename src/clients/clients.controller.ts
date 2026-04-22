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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Clients')
@ApiBearerAuth()
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles(RoleKey.ADMIN)
  @ApiOperation({ summary: 'Create client (admin only)' })
  @ApiBody({ type: CreateClientDto })
  @ApiOkResponse({ description: 'Client created successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async create(@Body() dto: CreateClientDto) {
    const data = await this.clientsService.create(dto);
    return { data };
  }

  @Get()
  @ApiOperation({ summary: 'List all clients' })
  @ApiOkResponse({ description: 'Returns all clients.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findAll() {
    const data = await this.clientsService.findAll();
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by id' })
  @ApiParam({ name: 'id', description: 'Client id (UUID)' })
  @ApiOkResponse({ description: 'Returns client details.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const data = await this.clientsService.findOne(id);
    return { data };
  }

  @Patch(':id')
  @Roles(RoleKey.ADMIN)
  @ApiOperation({ summary: 'Update client by id (admin only)' })
  @ApiParam({ name: 'id', description: 'Client id (UUID)' })
  @ApiBody({ type: UpdateClientDto })
  @ApiOkResponse({ description: 'Client updated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateClientDto,
  ) {
    const data = await this.clientsService.update(id, dto);
    return { data };
  }
}
