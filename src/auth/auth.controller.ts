import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('super-admin/login')
  async loginSuperAdmin(@Body() dto: SuperAdminLoginDto): Promise<{
    data: {
      accessToken: string;
      superAdmin: {
        id: string;
        email: string;
        fullName: string;
      };
    };
  }> {
    const data = await this.authService.loginSuperAdmin(dto);
    return { data };
  }
}
