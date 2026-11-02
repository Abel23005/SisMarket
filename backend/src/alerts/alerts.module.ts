import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockAlert } from './entities/stock-alert.entity';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlanGuard } from '../subscriptions/plan.guard';

@Module({
  imports: [TypeOrmModule.forFeature([StockAlert]), SubscriptionsModule],
  controllers: [AlertsController],
  providers: [AlertsService, PlanGuard],
})
export class AlertsModule {}
