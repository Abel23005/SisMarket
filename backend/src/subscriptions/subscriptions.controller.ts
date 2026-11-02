import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { SubscribeDto } from './dto/subscribe.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('catalog') catalog() { return this.subscriptions.catalog(); }
  @Get('me') current(@CurrentUser() user: { businessId: string }) { return this.subscriptions.current(user.businessId); }
  @Get('entitlements')
  @Roles(UserRole.OWNER, UserRole.CASHIER, UserRole.WAREHOUSE)
  entitlements(@CurrentUser() user: { businessId: string }) { return this.subscriptions.entitlements(user.businessId); }
  @Post() subscribe(@Body() dto: SubscribeDto, @CurrentUser() user: { id: string; businessId: string }) { return this.subscriptions.subscribe(user.businessId, user.id, dto); }
  @Post('cancel') cancel(@CurrentUser() user: { businessId: string }) { return this.subscriptions.cancel(user.businessId); }
  @Post('refresh') refresh(@CurrentUser() user: { businessId: string }) { return this.subscriptions.refresh(user.businessId); }
}
