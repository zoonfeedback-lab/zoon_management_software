import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InternsController } from './interns.controller';
import { InternsService } from './interns.service';

@Module({
  imports: [AuthModule],
  controllers: [InternsController],
  providers: [InternsService],
  exports: [InternsService],
})
export class InternsModule {}
