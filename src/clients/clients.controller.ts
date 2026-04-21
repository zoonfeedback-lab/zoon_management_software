import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { SuperAdminAuthGuard } from '../auth/guards/super-admin-auth.guard';

@Controller('clients')
@UseGuards(SuperAdminAuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  async create(@Body() dto: CreateClientDto) {
    const data = await this.clientsService.create(dto);
    return { data };
  }

  @Get()
  async findAll() {
    const data = await this.clientsService.findAll();
    return { data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    const data = await this.clientsService.update(id, dto);
    return { data };
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    const data = await this.clientsService.deactivate(id);
    return { data };
  }

  @Patch(':id/reactivate')
  async reactivate(@Param('id') id: string) {
    const data = await this.clientsService.reactivate(id);
    return { data };
  }
}
