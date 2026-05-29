import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  findAll() {
    return this.productsRepository.find({
      where: { active: true },
      order: { name: 'ASC' },
    });
  }

  findLowStock() {
    return this.productsRepository
      .createQueryBuilder('product')
      .where('product.active = true')
      .andWhere('product.stock <= product.minStock')
      .orderBy('product.stock', 'ASC')
      .getMany();
  }

  async findOne(id: string) {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return product;
  }

  create(dto: CreateProductDto) {
    const product = this.productsRepository.create(dto);
    return this.productsRepository.save(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.productsRepository.save(product);
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    product.active = false;
    return this.productsRepository.save(product);
  }
}
