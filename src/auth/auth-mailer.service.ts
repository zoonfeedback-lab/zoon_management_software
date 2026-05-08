import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuthMailerService {
  private readonly logger = new Logger(AuthMailerService.name);

  async sendClientSetupEmail(email: string, setupLink: string) {
    this.logger.log(`Client setup email queued for ${email}: ${setupLink}`);
  }

  async sendPasswordResetEmail(email: string, resetLink: string) {
    this.logger.log(`Password reset email queued for ${email}: ${resetLink}`);
  }
}
