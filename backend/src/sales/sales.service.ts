import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CashSessionStatus } from '../common/enums/cash-session-status.enum';
import { PaymentMethod } from '../common/enums/payment-method.enum';
import { SaleStatus } from '../common/enums/sale-status.enum';
import { CashSession } from '../cash-register/entities/cash-session.entity';
import { NubefactService } from '../nubefact/nubefact.service';
import { Product } from '../products/entities/product.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleItem } from './entities/sale-item.entity';
import { Sale } from './entities/sale.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
    private readonly dataSource: DataSource,
    private readonly nubefactService: NubefactService,
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
    const sale = await this.dataSource.transaction(async (manager) => {
      if (dto.cashSessionId) {
        const session = await manager.findOne(CashSession, {
          where: { id: dto.cashSessionId, cashierId },
        });
        if (!session || session.status !== CashSessionStatus.OPEN) {
          throw new BadRequestException('La caja no está abierta');
        }
      }

      const saleItems: SaleItem[] = [];
      let total = 0;

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
        const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
        total += lineTotal;
        product.stock -= item.quantity;
        await manager.save(product);
        saleItems.push(
          manager.create(SaleItem, {
            productId: product.id,
            quantity: item.quantity,
            unitPrice,
            subtotal: lineTotal,
          }),
        );
      }

      total = Number(total.toFixed(2));
      const subtotal = Number((total / 1.18).toFixed(2));
      const tax = Number((total - subtotal).toFixed(2));
      const ticketNumber = `T-${Date.now()}`;

      const sale = await manager.save(
        manager.create(Sale, {
          ticketNumber,
          cashierId,
          cashSessionId: dto.cashSessionId ?? null,
          subtotal,
          tax,
          total,
          paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH,
          status: SaleStatus.COMPLETED,
        }),
      );

      await manager.save(
        saleItems.map((item) =>
          manager.create(SaleItem, {
            ...item,
            saleId: sale.id,
          }),
        ),
      );

      return manager.findOneOrFail(Sale, {
        where: { id: sale.id },
        relations: { items: { product: true }, cashier: true },
      });
    });

    if (this.nubefactService.isEnabled() && this.nubefactService.shouldAutoSend()) {
      const result = await this.nubefactService.emitBoleta(sale);
      sale.nubefactStatus = result.status;
      sale.nubefactResponse = result.response ? { ...result.response } : null;
      sale.nubefactPdfUrl = result.response?.enlace_del_pdf ?? result.response?.enlace ?? null;
      sale.nubefactXmlUrl = result.response?.enlace_del_xml ?? null;
      sale.nubefactCdrUrl = result.response?.enlace_del_cdr ?? null;
      return this.salesRepository.save(sale);
    }

    return sale;
  }
}
