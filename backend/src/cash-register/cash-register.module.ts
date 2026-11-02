import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import { CashSession } from './entities/cash-session.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlanGuard } from '../subscriptions/plan.guard';

@Module({
  imports: [TypeOrmModule.forFeature([CashSession, Sale]), SubscriptionsModule],
  controllers: [CashRegisterController],
  providers: [CashRegisterService, PlanGuard],
})
export class CashRegisterModule {}
