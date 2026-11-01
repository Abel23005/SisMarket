import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
  ) {}

  findAll() {
    return this.productsRepository.find({
      where: { active: true },
      relations: { supplier: true },
      order: { name: 'ASC' },
    });
  }

  findLowStock() {
    return this.productsRepository
      .createQueryBuilder('product')
      .where('product.active = true')
      .andWhere('product.stock <= product.minStock')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .orderBy('product.stock', 'ASC')
      .getMany();
  }

  async findOne(id: string) {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: { supplier: true },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return product;
  }

  async create(dto: CreateProductDto) {
    const supplier = dto.supplierId
      ? await this.findSupplier(dto.supplierId)
      : null;
    const product = this.productsRepository.create({
      ...dto,
      supplierId: supplier?.id ?? null,
      supplier,
    });
    return this.productsRepository.save(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.findOne(id);
    const { supplierId, ...productData } = dto;
    Object.assign(product, productData);
    if (supplierId !== undefined) {
      const supplier = supplierId ? await this.findSupplier(supplierId) : null;
      product.supplierId = supplier?.id ?? null;
      product.supplier = supplier;
    }
    return this.productsRepository.save(product);
  }

  private async findSupplier(id: string) {
    const supplier = await this.suppliersRepository.findOne({
      where: { id, active: true },
    });
    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado o inactivo');
    }
    return supplier;
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    product.active = false;
    return this.productsRepository.save(product);
  }
}
