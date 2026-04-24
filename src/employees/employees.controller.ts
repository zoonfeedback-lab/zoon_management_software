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
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Employees')
@ApiBearerAuth()
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Roles(RoleKey.ADMIN)
  @ApiOperation({ summary: 'Create a new employee (admin only)' })
  @ApiBody({ type: CreateEmployeeDto })
  @ApiCreatedResponse({ description: 'Employee created successfully.' })
  @ApiForbiddenResponse({ description: 'Only admins can create employees.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async create(@Body() dto: CreateEmployeeDto) {
    const data = await this.employeesService.create(dto);
    return { data };
  }

  @Get()
  @Roles(RoleKey.ADMIN)
  @ApiOperation({ summary: 'List all employees (admin only)' })
  @ApiOkResponse({ description: 'Returns all employees.' })
  @ApiForbiddenResponse({ description: 'Only admins can list all employees.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findAll() {
    const data = await this.employeesService.findAll();
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by id' })
  @ApiParam({ name: 'id', description: 'Employee id (UUID)' })
  @ApiOkResponse({ description: 'Returns employee details.' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.employeesService.findOne(id, user);
    return { data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update employee by id' })
  @ApiParam({ name: 'id', description: 'Employee id (UUID)' })
  @ApiBody({ type: UpdateEmployeeDto })
  @ApiOkResponse({ description: 'Employee updated successfully.' })
  @ApiForbiddenResponse({
    description: 'You can update only allowed employee records.',
  })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.employeesService.update(id, dto, user);
    return { data };
  }
}
