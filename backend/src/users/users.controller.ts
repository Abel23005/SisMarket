import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.OWNER)
  findAll(@CurrentUser() user: { businessId: string }) {
    return this.usersService.findAll(user.businessId);
  }

  @Patch(':id/role')
  @Roles(UserRole.OWNER)
  updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto, @CurrentUser() actor: { id: string; businessId: string }) {
    return this.usersService.updateRole(id, dto.role, actor.id, actor.businessId);
  }

  @Patch(':id/status')
  @Roles(UserRole.OWNER)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto, @CurrentUser() actor: { id: string; businessId: string }) {
    return this.usersService.updateStatus(id, dto.active, actor.id, actor.businessId);
  }

  @Patch(':id/password')
  @Roles(UserRole.OWNER)
  resetPassword(@Param('id') id: string, @Body() dto: ResetUserPasswordDto, @CurrentUser() actor: { businessId: string }) {
    return this.usersService.resetPassword(id, dto.password, actor.businessId);
  }
}
