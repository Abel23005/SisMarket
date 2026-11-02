import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InventoryMovement } from '../inventory/entities/inventory-movement.entity';
import { Product } from '../products/entities/product.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { synchronizeStockAlert } from '../alerts/stock-alert.utils';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly ordersRepository: Repository<PurchaseOrder>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(businessId: string) {
    return this.ordersRepository.find({
      where: { businessId },
      relations: { supplier: true, items: { product: true }, creator: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async findOne(id: string, businessId: string) {
    const order = await this.ordersRepository.findOne({
      where: { id, businessId },
      relations: { supplier: true, items: { product: true }, creator: true },
    });
    if (!order) throw new NotFoundException('Orden de compra no encontrada');
    return order;
  }

  async create(dto: CreatePurchaseOrderDto, userId: string, businessId: string) {
    return this.dataSource.transaction(async (manager) => {
      const supplier = await manager.findOne(Supplier, {
        where: { id: dto.supplierId, businessId, active: true },
      });
      if (!supplier) throw new NotFoundException('Proveedor no encontrado o inactivo');

      const lines: PurchaseOrderItem[] = [];
      let total = 0;
      for (const line of dto.items) {
        const product = await manager.findOne(Product, {
          where: { id: line.productId, businessId, active: true },
        });
        if (!product) throw new NotFoundException(`Producto ${line.productId} no encontrado o inactivo`);
        const subtotal = Number((line.quantity * line.unitCost).toFixed(2));
        total += subtotal;
        lines.push(manager.create(PurchaseOrderItem, {
          productId: product.id,
          quantity: line.quantity,
          receivedQuantity: 0,
          unitCost: line.unitCost,
          subtotal,
        }));
      }

      const order = await manager.save(manager.create(PurchaseOrder, {
        orderNumber: `OC-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`,
        businessId,
        supplierId: supplier.id,
        createdBy: userId,
        status: 'pending',
        total: Number(total.toFixed(2)),
        notes: dto.notes?.trim() || null,
        items: lines,
      }));
      return manager.findOneOrFail(PurchaseOrder, {
        where: { id: order.id },
        relations: { supplier: true, items: { product: true }, creator: true },
      });
    });
  }

  async receive(id: string, userId: string, businessId: string) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(PurchaseOrder, {
        where: { id, businessId },
        relations: { items: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Orden de compra no encontrada');
      if (order.status !== 'pending') {
        throw new BadRequestException('Solo se pueden recibir órdenes pendientes');
      }

      for (const item of order.items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId, businessId, active: true },
          lock: { mode: 'pessimistic_write' },
        });
        if (!product) throw new NotFoundException(`El producto ${item.productId} ya no está activo`);
        product.stock += item.quantity;
        await manager.save(product);
        await synchronizeStockAlert(manager, product, businessId);
        item.receivedQuantity = item.quantity;
        await manager.save(item);
        await manager.save(manager.create(InventoryMovement, {
          productId: product.id,
          businessId,
          userId,
          type: 'purchase',
          quantityChange: item.quantity,
          stockAfter: product.stock,
          reason: `Recepción ${order.orderNumber}`,
          referenceId: order.id,
        }));
      }

      order.status = 'received';
      order.receivedAt = new Date();
      await manager.save(order);
      const supplier = await manager.findOneOrFail(Supplier, { where: { id: order.supplierId, businessId } });
      const orderDate = new Date();
      const currentMonth = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
      }).format(orderDate).slice(0, 7);
      const previousMonth = supplier.lastOrder?.slice(0, 7);
      supplier.monthlyTotal = Number(previousMonth === currentMonth ? supplier.monthlyTotal : 0) + Number(order.total);
      supplier.lastOrder = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(orderDate);
      await manager.save(supplier);

      return manager.findOneOrFail(PurchaseOrder, {
        where: { id },
        relations: { supplier: true, items: { product: true }, creator: true },
      });
    });
  }

  async cancel(id: string, businessId: string) {
    const order = await this.ordersRepository.findOne({ where: { id, businessId } });
    if (!order) throw new NotFoundException('Orden de compra no encontrada');
    if (order.status !== 'pending') {
      throw new BadRequestException('Solo se pueden cancelar órdenes pendientes');
    }
    order.status = 'cancelled';
    return this.ordersRepository.save(order);
  }
}
