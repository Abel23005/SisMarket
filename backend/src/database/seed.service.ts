import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async onModuleInit() {
    await this.seedUsers();
    await this.seedProducts();
  }

  private async seedUsers() {
    const count = await this.usersRepository.count();
    if (count > 0) {
      return;
    }

    const users = [
      {
        username: 'juan.perez',
        email: 'juan@sismarket.pe',
        fullName: 'Juan Pérez',
        role: UserRole.OWNER,
        password: 'admin123',
      },
      {
        username: 'maria.lopez',
        email: 'maria@sismarket.pe',
        fullName: 'María López',
        role: UserRole.CASHIER,
        password: 'cajero123',
      },
      {
        username: 'carlos.ruiz',
        email: 'carlos@sismarket.pe',
        fullName: 'Carlos Ruiz',
        role: UserRole.WAREHOUSE,
        password: 'almacen123',
      },
    ];

    for (const data of users) {
      const passwordHash = await bcrypt.hash(data.password, 10);
      await this.usersRepository.save(
        this.usersRepository.create({
          username: data.username,
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          passwordHash,
        }),
      );
    }
    this.logger.log('Usuarios de prueba creados');
  }

  private async seedProducts() {
    const count = await this.productsRepository.count();
    if (count > 0) {
      return;
    }

    const products = [
      {
        name: 'Arroz Costeño 1kg',
        sku: 'ARR-001',
        barcode: '7751234567890',
        price: 4.5,
        stock: 120,
        category: 'Abarrotes',
      },
      {
        name: 'Aceite Primor 1L',
        sku: 'ACE-001',
        barcode: '7751234567891',
        price: 9.9,
        stock: 45,
        category: 'Abarrotes',
      },
      {
        name: 'Leche Gloria 390g',
        sku: 'LEC-001',
        barcode: '7751234567892',
        price: 4.2,
        stock: 8,
        minStock: 10,
        category: 'Lácteos',
      },
      {
        name: 'Galletas Soda 6u',
        sku: 'GAL-001',
        barcode: '7751234567893',
        price: 2.5,
        stock: 60,
        category: 'Snacks',
      },
      {
        name: 'Coca Cola 500ml',
        sku: 'BEB-001',
        barcode: '7751234567894',
        price: 3.0,
        stock: 90,
        category: 'Bebidas',
      },
    ];

    await this.productsRepository.save(
      products.map((p) => this.productsRepository.create(p)),
    );
    this.logger.log('Productos de ejemplo creados');
  }
}
