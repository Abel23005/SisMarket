import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { Supplier } from './entities/supplier.entity';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
  ) {}

  findAll() {
    return this.suppliersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  create(dto: CreateSupplierDto) {
    const supplier = this.suppliersRepository.create({
      ...dto,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      lastOrder: dto.lastOrder ?? null,
      monthlyTotal: dto.monthlyTotal ?? 0,
      active: dto.active ?? true,
    });
    return this.suppliersRepository.save(supplier);
  }

  async remove(id: string) {
    const supplier = await this.suppliersRepository.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
    }
    await this.suppliersRepository.remove(supplier);
    return { id };
  }
}
