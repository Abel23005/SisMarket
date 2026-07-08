import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { Sale } from '../sales/entities/sale.entity';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Sale])],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
