import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentsService } from './comments.service';

@Controller('tasks/:id/comments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Comments')
@ApiBearerAuth()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create comment for task' })
  @ApiParam({ name: 'id', description: 'Task id (UUID)' })
  @ApiBody({ type: CreateCommentDto })
  @ApiCreatedResponse({ description: 'Comment created successfully.' })
  @ApiNotFoundResponse({ description: 'Task not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async create(
    @Param('id', new ParseUUIDPipe()) taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.commentsService.create(taskId, dto, user);
    return { data };
  }

  @Get()
  @ApiOperation({ summary: 'List comments for task' })
  @ApiParam({ name: 'id', description: 'Task id (UUID)' })
  @ApiOkResponse({ description: 'Returns comments for the task.' })
  @ApiNotFoundResponse({ description: 'Task not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findByTask(
    @Param('id', new ParseUUIDPipe()) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.commentsService.findByTask(taskId, user);
    return { data };
  }
}
