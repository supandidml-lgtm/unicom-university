import 'reflect-metadata';
import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { loadApiEnvironment } from '@unicom/config';
import type { Request, Response } from 'express';
import { authRequestContext, sessionTokenFromRequest } from './auth-request.js';
import { AuthService } from './auth.service.js';
import { PasswordRecoveryService } from './password-recovery.service.js';
// NestJS reads these constructors through emitted decorator metadata for runtime validation.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ActivateAccountDto } from './dto/activate-account.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { LoginDto } from './dto/login.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { sessionCookieOptions } from './session-cookie.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(PasswordRecoveryService) private readonly recovery: PasswordRecoveryService,
  ) {}

  @Post('activate')
  @HttpCode(204)
  async activate(@Body() dto: ActivateAccountDto, @Req() request: Request): Promise<void> {
    await this.authService.activate(dto, authRequestContext(request));
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(
      dto,
      authRequestContext(request),
      this.clientIp(request),
    );
    response.cookie(
      loadApiEnvironment().AUTH_COOKIE_NAME,
      result.sessionToken,
      this.cookieOptions(),
    );
    return { user: result.user, csrfToken: result.csrfToken };
  }

  @Post('forgot-password')
  @HttpCode(202)
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() request: Request) {
    return this.recovery.forgot(dto, authRequestContext(request), this.clientIp(request));
  }

  @Post('reset-password')
  @HttpCode(204)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() request: Request): Promise<void> {
    await this.recovery.reset(dto, authRequestContext(request), this.clientIp(request));
  }

  @Get('me')
  async me(@Req() request: Request) {
    return {
      user: await this.authService.me(
        sessionTokenFromRequest(request),
        authRequestContext(request),
      ),
    };
  }

  @Get('csrf')
  async csrf(@Req() request: Request) {
    return {
      csrfToken: await this.authService.csrf(
        sessionTokenFromRequest(request),
        authRequestContext(request),
      ),
    };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const environment = loadApiEnvironment();
    await this.authService.logout(
      sessionTokenFromRequest(request),
      request.header('x-csrf-token'),
      authRequestContext(request),
    );
    response.clearCookie(environment.AUTH_COOKIE_NAME, this.cookieOptions());
  }

  private cookieOptions() {
    return sessionCookieOptions(loadApiEnvironment());
  }

  private clientIp(request: Request): string {
    // Express only trusts forwarded headers when the explicit trust-proxy setting is enabled.
    return request.ip || request.socket.remoteAddress || 'unavailable';
  }
}
