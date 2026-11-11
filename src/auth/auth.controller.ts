import {
  BadRequestException,
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthenticatedRequest, principal } from './shop-access.guard';
import { z } from 'zod';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() body: { username: string; password: string }) {
    return this.usersService.createUser(body.username, body.password);
  }

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const user = await this.authService.validateUser(
      body.username,
      body.password,
    );

    if (!user) {
      return { error: 'Invalid credentials' };
    }

    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    if (!z.strictObject({}).safeParse(body).success)
      throw new BadRequestException('Logout expects an empty JSON object.');
    return this.authService.logout(principal(request.user).userId);
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshTokens(body.refreshToken);
  }
}
