import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { SubscriptionsService } from './subscriptions.service';
import { REQUIRED_PLAN_KEY, RequiredPlan } from './requires-plan.decorator';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<RequiredPlan>(REQUIRED_PLAN_KEY, [context.getHandler(), context.getClass()]);
    if (!required || this.config.get<string>('SUBSCRIPTION_ENFORCEMENT', 'false') !== 'true') return true;
    const user = context.switchToHttp().getRequest().user as { businessId?: string } | undefined;
    if (!user?.businessId) throw new ForbiddenException('No se pudo determinar el negocio de la sesión');
    await this.subscriptions.assertPlan(user.businessId, required);
    return true;
  }
}
