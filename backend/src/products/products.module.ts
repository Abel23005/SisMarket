import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Product } from './entities/product.entity';
import { InventoryMovement } from '../inventory/entities/inventory-movement.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { StockAlert } from '../alerts/entities/stock-alert.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlanGuard } from '../subscriptions/plan.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Supplier, InventoryMovement, StockAlert]), SubscriptionsModule],
  controllers: [ProductsController],
  providers: [ProductsService, PlanGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
