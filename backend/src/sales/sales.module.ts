import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashSession } from '../cash-register/entities/cash-session.entity';
import { NubefactModule } from '../nubefact/nubefact.module';
import { Product } from '../products/entities/product.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Sale } from './entities/sale.entity';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { InventoryMovement } from '../inventory/entities/inventory-movement.entity';
import { StockAlert } from '../alerts/entities/stock-alert.entity';
import { PaymentsModule } from '../payments/payments.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlanGuard } from '../subscriptions/plan.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, SaleItem, Product, CashSession, InventoryMovement, StockAlert]), NubefactModule, PaymentsModule, SubscriptionsModule],
  controllers: [SalesController],
  providers: [SalesService, PlanGuard],
})
export class SalesModule {}
