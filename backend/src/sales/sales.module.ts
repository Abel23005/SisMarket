import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashSession } from '../cash-register/entities/cash-session.entity';
import { NubefactModule } from '../nubefact/nubefact.module';
import { Product } from '../products/entities/product.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Sale } from './entities/sale.entity';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, SaleItem, Product, CashSession]), NubefactModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
