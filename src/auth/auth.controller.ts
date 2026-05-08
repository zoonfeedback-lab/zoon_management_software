import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RoleKey } from '@prisma/client';
import type { Request, Response } from 'express';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { EmployeeLoginDto } from './dto/employee-login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './interfaces/authenticated-request.interface';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { CreateClientInviteDto } from './dto/create-client-invite.dto';
import { VerifySetupTokenDto } from './dto/verify-setup-token.dto';
import { SetupPasswordDto } from './dto/setup-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { setRefreshCookie, clearRefreshCookie, getCookieValue, REFRESH_COOKIE_NAME } from './utils/cookie.util';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard';
import { RateLimit } from './decorators/rate-limit.decorator';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('verify-setup-token')
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ max: 20, windowMs: 60_000, keyPrefix: 'verify-setup-token' })
  @ApiOperation({ summary: 'Verify setup token validity' })
  @ApiBody({ type: VerifySetupTokenDto })
  @ApiOkResponse({ description: 'Token validation result.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests.' })
  async verifySetupToken(@Body() dto: VerifySetupTokenDto) {
    const data = await this.authService.verifySetupToken(dto.token);
    return { data };
  }

  @Post('setup-password')
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ max: 10, windowMs: 60_000, keyPrefix: 'setup-password' })
  @ApiOperation({ summary: 'Set initial password using setup token and activate account' })
  @ApiBody({ type: SetupPasswordDto })
  @ApiOkResponse({ description: 'Password set and account activated.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests.' })
  async setupPassword(
    @Body() dto: SetupPasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.authService.setupPassword(dto, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    setRefreshCookie(response, data.refreshToken, data.refreshTokenMaxAgeMs);
    return {
      data: {
        accessToken: data.accessToken,
        user: data.user,
      },
    };
  }

  @Post('login')
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ max: 10, windowMs: 60_000, keyPrefix: 'login' })
  @ApiOperation({ summary: 'Authenticate user and return access token' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Login successful.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests.' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.authService.login(dto, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    setRefreshCookie(response, data.refreshToken, data.refreshTokenMaxAgeMs);
    return {
      data: {
        accessToken: data.accessToken,
        user: data.user,
      },
    };
  }

  @Post('employee/login')
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ max: 10, windowMs: 60_000, keyPrefix: 'employee-login' })
  @ApiOperation({
    summary: 'Employee login — validates employee role and returns mustChangePassword flag',
    description:
      'Authenticate an employee using the credentials provided by admin via email. ' +
      'If `mustChangePassword` is true in the response, the frontend should redirect ' +
      'the employee to the change-password screen before allowing dashboard access.',
  })
  @ApiBody({ type: EmployeeLoginDto })
  @ApiOkResponse({
    description:
      'Login successful. Check `data.mustChangePassword` to decide if password change is required.',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  @ApiForbiddenResponse({
    description: 'User is not an employee (INTERNEE or CORE_TEAM).',
  })
  @ApiTooManyRequestsResponse({ description: 'Too many requests.' })
  async employeeLogin(
    @Body() dto: EmployeeLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.authService.employeeLogin(dto, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    setRefreshCookie(response, data.refreshToken, data.refreshTokenMaxAgeMs);
    return {
      data: {
        accessToken: data.accessToken,
        mustChangePassword: data.mustChangePassword,
        user: data.user,
      },
    };
  }

  @Patch('employee/change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change employee password',
    description:
      'Allows an authenticated employee to change their admin-provided password. ' +
      'After a successful change, the `mustChangePassword` flag is cleared. ' +
      'The employee must provide the current password for verification.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ description: 'Password changed successfully.' })
  @ApiBadRequestResponse({ description: 'Current password is incorrect.' })
  @ApiForbiddenResponse({ description: 'Only employees can use this endpoint.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.authService.changePassword(user.id, dto);
    return { data };
  }

  @Post('refresh')
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ max: 30, windowMs: 60_000, keyPrefix: 'refresh' })
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  @ApiOkResponse({ description: 'Access token refreshed successfully.' })
  @ApiUnauthorizedResponse({ description: 'Refresh token is missing or invalid.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests.' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = getCookieValue(request, REFRESH_COOKIE_NAME);
    if (!refreshToken) {
      clearRefreshCookie(response);
      throw new UnauthorizedException('Refresh token is missing');
    }

    const data = await this.authService.refresh(refreshToken, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    setRefreshCookie(response, data.refreshToken, data.refreshTokenMaxAgeMs);
    return {
      data: {
        accessToken: data.accessToken,
      },
    };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke refresh session' })
  @ApiOkResponse({ description: 'Logout successful.' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = getCookieValue(request, REFRESH_COOKIE_NAME);
    const data = await this.authService.logout(refreshToken);
    clearRefreshCookie(response);
    return { data };
  }

  @Post('forgot-password')
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ max: 8, windowMs: 60_000, keyPrefix: 'forgot-password' })
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({ description: 'Password reset process initiated.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests.' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const data = await this.authService.forgotPassword(dto);
    return { data };
  }

  @Post('reset-password')
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ max: 8, windowMs: 60_000, keyPrefix: 'reset-password' })
  @ApiOperation({ summary: 'Reset password using reset token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: 'Password reset successful.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests.' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.authService.resetPassword(dto, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    setRefreshCookie(response, data.refreshToken, data.refreshTokenMaxAgeMs);
    return {
      data: {
        accessToken: data.accessToken,
        user: data.user,
      },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiOkResponse({ description: 'Current authenticated user.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.authService.getMe(user.id);
    return { data };
  }
}
