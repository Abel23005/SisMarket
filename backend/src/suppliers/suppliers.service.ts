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

  findAll(businessId: string) {
    return this.suppliersRepository.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });
  }

  create(dto: CreateSupplierDto, businessId: string) {
    const supplier = this.suppliersRepository.create({
      ...dto,
      businessId,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      lastOrder: dto.lastOrder ?? null,
      monthlyTotal: dto.monthlyTotal ?? 0,
      active: dto.active ?? true,
    });
    return this.suppliersRepository.save(supplier);
  }

  async remove(id: string, businessId: string) {
    const supplier = await this.suppliersRepository.findOne({ where: { id, businessId } });
    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
    }
    supplier.active = false;
    await this.suppliersRepository.save(supplier);
    return { id, active: false };
  }
}
