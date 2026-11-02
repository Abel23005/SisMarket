import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { Sale } from '../sales/entities/sale.entity';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlanGuard } from '../subscriptions/plan.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Sale]), SubscriptionsModule],
  controllers: [AssistantController],
  providers: [AssistantService, PlanGuard],
})
export class AssistantModule {}
