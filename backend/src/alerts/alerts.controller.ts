import { Controller, Get, Param, Patch, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { AlertsService } from './alerts.service';
import { PlanGuard } from '../subscriptions/plan.guard';
import { RequiresPlan } from '../subscriptions/requires-plan.decorator';

@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
@RequiresPlan('basico')
@Roles(UserRole.OWNER, UserRole.WAREHOUSE)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  findOpen(@CurrentUser() user: { businessId: string }) {
    return this.alerts.findOpen(user.businessId);
  }

  @Get('history')
  findHistory(@CurrentUser() user: { businessId: string }) {
    return this.alerts.findHistory(user.businessId);
  }

  @Patch(':id/acknowledge')
  acknowledge(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { businessId: string }) {
    return this.alerts.acknowledge(id, user.businessId);
  }
}
