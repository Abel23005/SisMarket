import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AcceptInvitationDto } from '../invitations/dto/accept-invitation.dto';
import { SetupOwnerDto } from './dto/setup-owner.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, { ip: request.ip, userAgent: request.get('user-agent') });
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: { id: string; username: string; businessId: string; jti: string }, @Req() request: Request) {
    return this.authService.logout(user, { ip: request.ip, userAgent: request.get('user-agent') });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Get('audit')
  audit(@CurrentUser() user: { businessId: string }) {
    return this.authService.listAuditLogs(user.businessId);
  }

  @Post('accept-invitation')
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.authService.acceptInvitation(dto);
  }

  @Get('setup-status')
  setupStatus() {
    return this.authService.setupStatus();
  }

  @Post('setup-owner')
  setupOwner(@Body() dto: SetupOwnerDto) {
    return this.authService.setupOwner(dto);
  }

  @Post('register-business')
  registerBusiness(@Body() dto: SetupOwnerDto) {
    return this.authService.registerBusiness(dto);
  }
}
