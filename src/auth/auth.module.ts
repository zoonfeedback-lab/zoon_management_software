import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard';
import { AuthMailerService } from './auth-mailer.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtExpiresIn =
          (configService.get<string>('JWT_EXPIRES_IN') as
            | StringValue
            | undefined) ?? '1d';

        return {
          secret:
            configService.get<string>('JWT_SECRET') ?? 'change-this-secret',
          signOptions: {
            expiresIn: jwtExpiresIn,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthMailerService,
    JwtAuthGuard,
    RolesGuard,
    AuthRateLimitGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
