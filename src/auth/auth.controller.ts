import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { EmployeeLoginDto } from './dto/employee-login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './interfaces/authenticated-request.interface';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user and return access token' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Login successful.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return { data };
  }

  @Post('employee/login')
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
  async employeeLogin(@Body() dto: EmployeeLoginDto) {
    const data = await this.authService.employeeLogin(dto);
    return { data };
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
