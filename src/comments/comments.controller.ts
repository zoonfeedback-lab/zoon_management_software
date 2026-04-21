import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentsService } from './comments.service';

@Controller('tasks/:id/comments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  async create(
    @Param('id', new ParseUUIDPipe()) taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.commentsService.create(taskId, dto, user);
    return { data };
  }

  @Get()
  async findByTask(
    @Param('id', new ParseUUIDPipe()) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.commentsService.findByTask(taskId, user);
    return { data };
  }
}
