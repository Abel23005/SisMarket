import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InventoryMovement } from '../inventory/entities/inventory-movement.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { synchronizeStockAlert } from '../alerts/stock-alert.utils';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
    @InjectRepository(InventoryMovement)
    private readonly movementsRepository: Repository<InventoryMovement>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(businessId: string) {
    return this.productsRepository.find({
      where: { businessId, active: true },
      relations: { supplier: true },
      order: { name: 'ASC' },
    });
  }

  findLowStock(businessId: string) {
    return this.productsRepository
      .createQueryBuilder('product')
      .where('product.active = true')
      .andWhere('product.business_id = :businessId', { businessId })
      .andWhere('product.stock <= product.minStock')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .orderBy('product.stock', 'ASC')
      .getMany();
  }

  async findOne(id: string, businessId: string) {
    const product = await this.productsRepository.findOne({
      where: { id, businessId },
      relations: { supplier: true },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return product;
  }

  async create(dto: CreateProductDto, userId: string, businessId: string) {
    const supplier = dto.supplierId
      ? await this.findSupplier(dto.supplierId, businessId)
      : null;
    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(manager.create(Product, {
        ...dto,
        businessId,
        supplierId: supplier?.id ?? null,
        supplier,
      }));
      if (saved.stock > 0) {
        await manager.save(manager.create(InventoryMovement, {
          productId: saved.id,
          businessId,
          userId: userId ?? null,
          type: 'opening',
          quantityChange: saved.stock,
          stockAfter: saved.stock,
          reason: 'Stock inicial',
          referenceId: null,
        }));
      }
      await synchronizeStockAlert(manager, saved, businessId);
      return saved;
    });
  }

  async update(id: string, dto: UpdateProductDto, userId: string, businessId: string) {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id, businessId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException('Producto no encontrado');
      const oldStock = product.stock;
      const { supplierId, ...productData } = dto;
      Object.assign(product, productData);
      if (supplierId !== undefined) {
        const supplier = supplierId
          ? await manager.findOne(Supplier, { where: { id: supplierId, businessId, active: true } })
          : null;
        if (supplierId && !supplier) {
          throw new NotFoundException('Proveedor no encontrado o inactivo');
        }
        product.supplierId = supplier?.id ?? null;
        product.supplier = supplier;
      }
      const saved = await manager.save(product);
      if (dto.stock !== undefined && dto.stock !== oldStock) {
        await manager.save(manager.create(InventoryMovement, {
          productId: saved.id,
          businessId,
          userId: userId ?? null,
          type: 'adjustment',
          quantityChange: saved.stock - oldStock,
          stockAfter: saved.stock,
          reason: 'Ajuste manual desde inventario',
          referenceId: null,
        }));
      }
      await synchronizeStockAlert(manager, saved, businessId);
      return saved;
    });
  }

  async findMovements(productId: string, businessId: string) {
    await this.findOne(productId, businessId);
    return this.movementsRepository.find({
      where: { productId, businessId },
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  private async findSupplier(id: string, businessId: string) {
    const supplier = await this.suppliersRepository.findOne({
      where: { id, businessId, active: true },
    });
    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado o inactivo');
    }
    return supplier;
  }

  async remove(id: string, businessId: string) {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, { where: { id, businessId }, lock: { mode: 'pessimistic_write' } });
      if (!product) throw new NotFoundException('Producto no encontrado');
      product.active = false;
      const saved = await manager.save(product);
      await synchronizeStockAlert(manager, saved, businessId);
      return saved;
    });
  }
}
