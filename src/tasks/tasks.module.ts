import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { ProjectManagerController } from './project-manager.controller';
import { ProjectManagerService } from './project-manager.service';
import { TaskRevisionService } from './task-revision.service';

@Module({
  imports: [AuthModule],
  controllers: [TasksController, ProjectManagerController],
  providers: [TasksService, ProjectManagerService, TaskRevisionService],
  exports: [TasksService, ProjectManagerService, TaskRevisionService],
})
export class TasksModule {}
