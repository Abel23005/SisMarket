import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CulqiService } from './culqi.service';
import { PlanGuard } from '../subscriptions/plan.guard';
import { RequiresPlan } from '../subscriptions/requires-plan.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard, PlanGuard)
@RequiresPlan('premium')
export class PaymentsController {
  constructor(private readonly culqi: CulqiService) {}

  @Get('culqi/config')
  getCulqiConfig(@CurrentUser() user: { businessId: string }) {
    return this.culqi.publicConfig(user.businessId);
  }
}
