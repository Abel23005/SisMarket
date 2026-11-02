import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { SaasSubscription } from './entities/saas-subscription.entity';
import { SubscriptionsController } from './subscriptions.controller';
import { CulqiWebhookController } from './culqi-webhook.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [TypeOrmModule.forFeature([SaasSubscription, User])],
  controllers: [SubscriptionsController, CulqiWebhookController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
