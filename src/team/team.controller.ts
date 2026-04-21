import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { SuperAdminAuthGuard } from '../auth/guards/super-admin-auth.guard';

@Controller('team')
@UseGuards(SuperAdminAuthGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  async create(@Body() dto: CreateTeamMemberDto) {
    const data = await this.teamService.create(dto);
    return { data };
  }

  @Get()
  async findAll() {
    const data = await this.teamService.findAll();
    return { data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeamMemberDto) {
    const data = await this.teamService.update(id, dto);
    return { data };
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    const data = await this.teamService.deactivate(id);
    return { data };
  }

  @Patch(':id/reactivate')
  async reactivate(@Param('id') id: string) {
    const data = await this.teamService.reactivate(id);
    return { data };
  }
}
