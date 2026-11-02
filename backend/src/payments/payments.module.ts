import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessProfile } from '../business/entities/business-profile.entity';
import { CulqiService } from './culqi.service';
import { PaymentsController } from './payments.controller';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlanGuard } from '../subscriptions/plan.guard';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessProfile]), AuthModule, SubscriptionsModule],
  controllers: [PaymentsController],
  providers: [CulqiService, PlanGuard],
  exports: [CulqiService],
})
export class PaymentsModule {}
