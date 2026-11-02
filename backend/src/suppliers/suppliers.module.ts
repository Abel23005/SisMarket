import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlanGuard } from '../subscriptions/plan.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier]), SubscriptionsModule],
  controllers: [SuppliersController],
  providers: [SuppliersService, PlanGuard],
  exports: [SuppliersService],
})
export class SuppliersModule {}
