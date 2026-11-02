import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { BusinessProfile } from '../business/entities/business-profile.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { Product } from '../products/entities/product.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { User } from '../users/entities/user.entity';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
    @InjectRepository(BusinessProfile)
    private readonly businessProfiles: Repository<BusinessProfile>,
    private readonly configService: ConfigService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async onModuleInit() {
    if (
      this.configService.get<string>('NODE_ENV') === 'production' ||
      this.configService.get<string>('DB_MIGRATIONS_RUN', 'true') === 'false'
    ) {
      return;
    }
    await this.tenantContext.run({ systemOperation: true }, async () => {
      await this.seedUsers();
      await this.seedProducts();
      await this.seedSuppliers();
    });
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

    const [ownerData, ...staffData] = users;
    const owner = await this.usersRepository.save(this.usersRepository.create({
      username: ownerData.username,
      email: ownerData.email,
      fullName: ownerData.fullName,
      role: ownerData.role,
      passwordHash: await bcrypt.hash(ownerData.password, 10),
    }));
    const business = await this.businessProfiles.save(this.businessProfiles.create({
      ownerId: owner.id,
      tradeName: 'SisMarket Demo',
    }));
    owner.businessId = business.id;
    await this.usersRepository.save(owner);
    for (const data of staffData) {
      await this.usersRepository.save(this.usersRepository.create({
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        businessId: business.id,
        passwordHash: await bcrypt.hash(data.password, 10),
      }));
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

    const businessId = await this.getBusinessId();
    await this.productsRepository.save(
      products.map((p) => this.productsRepository.create({ ...p, businessId })),
    );
    this.logger.log('Productos de ejemplo creados');
  }

  private async seedSuppliers() {
    if ((await this.suppliersRepository.count()) > 0) return;

    const businessId = await this.getBusinessId();
    const suppliers = [
      {
        name: 'Alicorp S.A.A.',
        sku: 'ACE-001',
      },
      {
        name: 'Costeño Alimentos S.A.C.',
        sku: 'ARR-001',
      },
      {
        name: 'Arca Continental Lindley S.A.',
        sku: 'BEB-001',
      },
      {
        name: 'Leche Gloria S.A.',
        sku: 'LEC-001',
      },
      {
        name: 'Productos Tissue del Perú S.A.C.',
        sku: 'PAP-001',
      },
    ];

    for (const data of suppliers) {
      const supplier = await this.suppliersRepository.save(
        this.suppliersRepository.create({
          name: data.name,
          businessId,
          contact: 'Referencia de marca; confirmar proveedor de compra',
          monthlyTotal: 0,
          active: true,
        }),
      );
      const product = await this.productsRepository.findOne({
        where: { sku: data.sku, businessId, active: true },
      });
      if (product) {
        product.supplierId = supplier.id;
        product.supplier = supplier;
        await this.productsRepository.save(product);
      }
    }

    this.logger.log('Proveedores de referencia creados para productos de ejemplo');
  }

  private async getBusinessId() {
    const owner = await this.usersRepository.findOne({ where: { role: UserRole.OWNER } });
    if (!owner?.businessId) throw new Error('No se encontró el negocio para cargar datos de muestra');
    return owner.businessId;
  }
}
