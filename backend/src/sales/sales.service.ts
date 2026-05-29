import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CashSessionStatus } from '../common/enums/cash-session-status.enum';
import { SaleStatus } from '../common/enums/sale-status.enum';
import { CashSession } from '../cash-register/entities/cash-session.entity';
import { Product } from '../products/entities/product.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleItem } from './entities/sale-item.entity';
import { Sale } from './entities/sale.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private readonly saleItemsRepository: Repository<SaleItem>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(CashSession)
    private readonly cashSessionsRepository: Repository<CashSession>,
    private readonly dataSource: DataSource,
  ) {}

  findAll() {
    return this.salesRepository.find({
      relations: { items: { product: true }, cashier: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async findOne(id: string) {
    const sale = await this.salesRepository.findOne({
      where: { id },
      relations: { items: { product: true }, cashier: true },
    });
    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }
    return sale;
  }

  async create(dto: CreateSaleDto, cashierId: string) {
    return this.dataSource.transaction(async (manager) => {
      if (dto.cashSessionId) {
        const session = await manager.findOne(CashSession, {
          where: { id: dto.cashSessionId },
        });
        if (!session || session.status !== CashSessionStatus.OPEN) {
          throw new BadRequestException('La caja no está abierta');
        }
      }

      const saleItems: SaleItem[] = [];
      let subtotal = 0;

      for (const item of dto.items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId, active: true },
          lock: { mode: 'pessimistic_write' },
        });
        if (!product) {
          throw new NotFoundException(
            `Producto ${item.productId} no encontrado`,
          );
        }
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${product.name}`,
          );
        }
        const unitPrice = Number(product.price);
        const lineSubtotal = unitPrice * item.quantity;
        subtotal += lineSubtotal;
        product.stock -= item.quantity;
        await manager.save(product);
        saleItems.push(
          manager.create(SaleItem, {
            productId: product.id,
            quantity: item.quantity,
            unitPrice,
            subtotal: lineSubtotal,
          }),
        );
      }

      const tax = Number((subtotal * 0.18).toFixed(2));
      const total = Number((subtotal + tax).toFixed(2));
      const ticketNumber = `T-${Date.now()}`;

      const sale = manager.create(Sale, {
        ticketNumber,
        cashierId,
        cashSessionId: dto.cashSessionId ?? null,
        subtotal,
        tax,
        total,
        paymentMethod: dto.paymentMethod,
        status: SaleStatus.COMPLETED,
        items: saleItems,
      });

      return manager.save(sale);
    });
  }
}
