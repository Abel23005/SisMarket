import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryMovement } from '../inventory/entities/inventory-movement.entity';
import { Product } from '../products/entities/product.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { StockAlert } from '../alerts/entities/stock-alert.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlanGuard } from '../subscriptions/plan.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PurchaseOrderItem,
      Supplier,
      Product,
      InventoryMovement,
      StockAlert,
    ]),
    SubscriptionsModule,
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService, PlanGuard],
})
export class PurchasesModule {}
