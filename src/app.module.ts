import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { CommentsModule } from './comments/comments.module';
import { ClientPortalModule } from './client-portal/client-portal.module';
import { DeliverablesModule } from './deliverables/deliverables.module';
import { AdminModule } from './admin/admin.module';
import { InternshipApplicationsModule } from './internship-applications/internship-applications.module';
import { InternsModule } from './interns/interns.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    EmployeesModule,
    InternsModule,
    ProjectsModule,
    TasksModule,
    CommentsModule,
    ClientPortalModule,
    DeliverablesModule,
    AdminModule,
    InternshipApplicationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
