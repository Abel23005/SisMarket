import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import { CashSession } from './entities/cash-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CashSession, Sale])],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
})
export class CashRegisterModule {}
