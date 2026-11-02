import { Body, Controller, Param, Post } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions/webhook')
export class CulqiWebhookController {
  constructor(private readonly subscriptions: SubscriptionsService) {}
  @Post(':secret') receive(@Param('secret') secret: string, @Body() body: Record<string, unknown>) {
    return this.subscriptions.processWebhook(secret, body);
  }
}
