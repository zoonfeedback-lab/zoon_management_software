import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InternshipApplicationsController } from './internship-applications.controller';
import { InternshipApplicationsService } from './internship-applications.service';

@Module({
  imports: [AuthModule],
  controllers: [InternshipApplicationsController],
  providers: [InternshipApplicationsService],
})
export class InternshipApplicationsModule {}
