import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
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
import { InventoryMovement } from '../inventory/entities/inventory-movement.entity';
import { synchronizeStockAlert } from '../alerts/stock-alert.utils';
import { CulqiService } from '../payments/culqi.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
    private readonly dataSource: DataSource,
    private readonly nubefactService: NubefactService,
    private readonly culqiService: CulqiService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  findAll(businessId: string) {
    return this.salesRepository.find({
      where: { businessId },
      relations: { items: { product: true }, cashier: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  findReport(businessId: string, from: string, to: string) {
    const endDate = new Date(`${to}T00:00:00Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    // created_at is stored as UTC timestamp without zone; Lima uses UTC-5.
    const start = `${from} 05:00:00`;
    const end = `${endDate.toISOString().slice(0, 10)} 05:00:00`;
    return this.salesRepository.createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .where('sale.businessId = :businessId', { businessId })
      .andWhere('sale.createdAt >= :start AND sale.createdAt < :end', { start, end })
      .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
      .orderBy('sale.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string, businessId: string) {
    const sale = await this.salesRepository.findOne({
      where: { id, businessId },
      relations: { items: { product: true }, cashier: true },
    });
    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }
    return sale;
  }

  async create(dto: CreateSaleDto, cashierId: string, businessId: string) {
    const paymentMethod = dto.paymentMethod ?? PaymentMethod.CASH;
    if (paymentMethod === PaymentMethod.CARD && !dto.culqiToken) throw new BadRequestException('Genera el token de tarjeta con Culqi Checkout antes de cobrar');
    if (paymentMethod === PaymentMethod.CARD && !dto.customerEmail) throw new BadRequestException('El correo del cliente es obligatorio para el pago con tarjeta');
    if (paymentMethod === PaymentMethod.CARD) await this.subscriptionsService.assertPlan(businessId, 'premium');
    if (dto.documentType === 'factura') await this.subscriptionsService.assertPlan(businessId, 'premium');
    if (paymentMethod !== PaymentMethod.CARD && dto.culqiToken) throw new BadRequestException('No envíes token Culqi para este método de pago');
    const sale = await this.dataSource.transaction(async (manager) => {
      const session = await manager.findOne(CashSession, {
        where: { id: dto.cashSessionId, cashierId, businessId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!session || session.status !== CashSessionStatus.OPEN) {
        throw new BadRequestException('Abre tu caja antes de registrar una venta');
      }

      const saleItems: SaleItem[] = [];
      const stockChanges: Array<{ productId: string; quantity: number; stockAfter: number }> = [];
      let total = 0;

      for (const item of dto.items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId, businessId, active: true },
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
        await synchronizeStockAlert(manager, product, businessId);
        stockChanges.push({ productId: product.id, quantity: item.quantity, stockAfter: product.stock });
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
      const ticketNumber = `T-${randomUUID()}`;

      const sale = await manager.save(
        manager.create(Sale, {
          ticketNumber,
          businessId,
          cashierId,
          cashSessionId: dto.cashSessionId,
          subtotal,
          tax,
          total,
          paymentMethod,
          status: paymentMethod === PaymentMethod.CARD ? SaleStatus.PAYMENT_PROCESSING : SaleStatus.COMPLETED,
          culqiChargeId: null,
          cardLastFour: null,
          documentType: dto.documentType ?? 'boleta',
          customerDocumentType: dto.documentType === 'factura' ? '6' : null,
          customerDocumentNumber: dto.customerDocumentNumber ?? null,
          customerName: dto.customerName?.trim() || 'CONSUMIDOR FINAL',
          customerAddress: dto.customerAddress?.trim() || null,
          customerEmail: dto.customerEmail?.trim().toLowerCase() || null,
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

      await manager.save(
        stockChanges.map((change) => manager.create(InventoryMovement, {
          productId: change.productId,
          businessId,
          userId: cashierId,
          type: 'sale',
          quantityChange: -change.quantity,
          stockAfter: change.stockAfter,
          reason: `Venta ${sale.ticketNumber}`,
          referenceId: sale.id,
        })),
      );

      return manager.findOneOrFail(Sale, {
        where: { id: sale.id },
        relations: { items: { product: true }, cashier: true },
      });
    });

    if (paymentMethod === PaymentMethod.CARD) {
      let charge: Awaited<ReturnType<CulqiService['createCharge']>> | undefined;
      try {
        charge = await this.culqiService.createCharge(businessId, dto.culqiToken!, Number(sale.total), dto.customerEmail!, `SisMarket ${sale.ticketNumber}`);
        const updated = await this.salesRepository.update({ id: sale.id, businessId, status: SaleStatus.PAYMENT_PROCESSING }, {
          status: SaleStatus.COMPLETED,
          culqiChargeId: charge.id ?? null,
          cardLastFour: charge.source?.last_four ?? null,
        });
        if (updated.affected !== 1) throw new Error('No se pudo confirmar la venta después del cargo');
        sale.status = SaleStatus.COMPLETED;
        sale.culqiChargeId = charge.id ?? null;
        sale.cardLastFour = charge.source?.last_four ?? null;
      } catch (error) {
        if (error instanceof BadRequestException) {
          await this.cancelFailedCardSale(sale.id, businessId);
          throw error;
        }
        sale.status = SaleStatus.PAYMENT_PENDING;
        sale.culqiChargeId = charge?.id ?? null;
        sale.cardLastFour = charge?.source?.last_four ?? null;
        await this.salesRepository.update({ id: sale.id, businessId, status: SaleStatus.PAYMENT_PROCESSING }, { status: SaleStatus.PAYMENT_PENDING, culqiChargeId: sale.culqiChargeId, cardLastFour: sale.cardLastFour }).catch(() => undefined);
        const current = await this.salesRepository.findOne({ where: { id: sale.id, businessId }, relations: { items: { product: true }, cashier: true } });
        return { ...(current ?? sale), paymentNotice: 'Pago pendiente de conciliación. Revisa el panel de Culqi y registra el ID del cargo antes de volver a cobrar.' };
      }
    }

    const planFeatures = await this.subscriptionsService.entitlements(businessId);
    if (sale.status === SaleStatus.COMPLETED && planFeatures.premium && await this.nubefactService.isEnabled(businessId) && this.nubefactService.shouldAutoSend()) {
      const result = await this.nubefactService.emitDocument(sale, businessId);
      sale.nubefactStatus = result.status;
      sale.nubefactResponse = result.response ? { ...result.response } : null;
      sale.nubefactPdfUrl = result.response?.enlace_del_pdf ?? result.response?.enlace ?? null;
      sale.nubefactXmlUrl = result.response?.enlace_del_xml ?? null;
      sale.nubefactCdrUrl = result.response?.enlace_del_cdr ?? null;
      sale.nubefactProcessingAt = null;
      return this.salesRepository.save(sale);
    }

    return sale;
  }

  async paymentConfig(businessId: string) {
    return this.culqiService.publicConfig(businessId);
  }

  async confirmPendingPayment(saleId: string, businessId: string, chargeId: string) {
    const sale = await this.findOne(saleId, businessId);
    if (![SaleStatus.PAYMENT_PENDING, SaleStatus.PAYMENT_PROCESSING].includes(sale.status) || sale.paymentMethod !== PaymentMethod.CARD) throw new BadRequestException('La venta no tiene un pago pendiente de tarjeta');
    const charge = await this.culqiService.verifyCharge(businessId, chargeId, Number(sale.total));
    await this.dataSource.transaction(async (manager) => {
      const lockedSale = await manager.findOne(Sale, { where: { id: saleId, businessId }, lock: { mode: 'pessimistic_write' } });
      if (!lockedSale || ![SaleStatus.PAYMENT_PENDING, SaleStatus.PAYMENT_PROCESSING].includes(lockedSale.status)) throw new BadRequestException('El pago de esta venta ya fue resuelto');
      lockedSale.status = SaleStatus.COMPLETED;
      lockedSale.culqiChargeId = charge.id ?? chargeId;
      lockedSale.cardLastFour = charge.source?.last_four ?? null;
      await manager.save(lockedSale);
    });
    return this.findOne(saleId, businessId);
  }

  async cancelPendingPayment(saleId: string, businessId: string) {
    const sale = await this.findOne(saleId, businessId);
    if (![SaleStatus.PAYMENT_PENDING, SaleStatus.PAYMENT_PROCESSING].includes(sale.status)) throw new BadRequestException('La venta no tiene un pago pendiente');
    if (sale.status === SaleStatus.PAYMENT_PROCESSING && Date.now() - new Date(sale.createdAt).getTime() < 120000) throw new BadRequestException('El cobro aún se está procesando; espera dos minutos antes de resolverlo');
    return this.cancelFailedCardSale(saleId, businessId);
  }

  private async cancelFailedCardSale(saleId: string, businessId: string) {
    await this.dataSource.transaction(async (manager) => {
      const sale = await manager.findOne(Sale, { where: { id: saleId, businessId }, relations: { items: true }, lock: { mode: 'pessimistic_write' } });
      if (!sale || ![SaleStatus.PAYMENT_PENDING, SaleStatus.PAYMENT_PROCESSING].includes(sale.status)) return;
      for (const item of sale.items) {
        const product = await manager.findOne(Product, { where: { id: item.productId, businessId }, lock: { mode: 'pessimistic_write' } });
        if (!product) continue;
        product.stock += item.quantity;
        await manager.save(product);
        await synchronizeStockAlert(manager, product, businessId);
        await manager.save(manager.create(InventoryMovement, { productId: product.id, businessId, userId: sale.cashierId, type: 'return', quantityChange: item.quantity, stockAfter: product.stock, reason: `Liberación por rechazo del pago ${sale.ticketNumber}`, referenceId: sale.id }));
      }
      sale.status = SaleStatus.CANCELLED;
      await manager.save(sale);
    });
    return this.findOne(saleId, businessId);
  }

  async emitDocument(id: string, businessId: string) {
    await this.subscriptionsService.assertPlan(businessId, 'premium');
    const sale = await this.findOne(id, businessId);
    if (sale.status !== SaleStatus.COMPLETED) throw new BadRequestException('Solo puedes emitir el comprobante de una venta completada');
    if (sale.nubefactStatus === 'accepted') {
      throw new BadRequestException('El comprobante ya fue aceptado por el proveedor');
    }
    if (!(await this.nubefactService.isEnabled(businessId))) {
      throw new BadRequestException('Configura las credenciales de Nubefact antes de emitir comprobantes');
    }
    const result = await this.nubefactService.emitDocument(sale, businessId);
    sale.nubefactStatus = result.status;
    sale.nubefactResponse = result.response ? { ...result.response } : null;
    sale.nubefactPdfUrl = result.response?.enlace_del_pdf ?? result.response?.enlace ?? null;
    sale.nubefactXmlUrl = result.response?.enlace_del_xml ?? null;
    sale.nubefactCdrUrl = result.response?.enlace_del_cdr ?? null;
    sale.nubefactProcessingAt = null;
    return this.salesRepository.save(sale);
  }
}
