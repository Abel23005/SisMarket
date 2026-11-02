import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashSessionStatus } from '../common/enums/cash-session-status.enum';
import { SaleStatus } from '../common/enums/sale-status.enum';
import { PaymentMethod } from '../common/enums/payment-method.enum';
import { Sale } from '../sales/entities/sale.entity';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { CashSession } from './entities/cash-session.entity';

@Injectable()
export class CashRegisterService {
  constructor(
    @InjectRepository(CashSession)
    private readonly sessionsRepository: Repository<CashSession>,
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
  ) {}

  findAll(businessId: string) {
    return this.sessionsRepository.find({
      where: { businessId },
      relations: { cashier: true },
      order: { openedAt: 'DESC' },
      take: 50,
    });
  }

  async findOpenByCashier(cashierId: string, businessId: string) {
    return this.sessionsRepository.findOne({
      where: { cashierId, businessId, status: CashSessionStatus.OPEN },
      relations: { cashier: true },
    });
  }

  async open(dto: OpenCashSessionDto, cashierId: string, businessId: string) {
    const existing = await this.findOpenByCashier(cashierId, businessId);
    if (existing) {
      throw new BadRequestException('Ya tienes una caja abierta');
    }
    const session = this.sessionsRepository.create({
      cashierId,
      businessId,
      openingAmount: dto.openingAmount,
      status: CashSessionStatus.OPEN,
    });
    return this.sessionsRepository.save(session);
  }

  async close(id: string, dto: CloseCashSessionDto, cashierId: string, businessId: string) {
    const session = await this.sessionsRepository.findOne({
      where: { id, cashierId, businessId },
    });
    if (!session) {
      throw new NotFoundException('Sesión de caja no encontrada');
    }
    if (session.status === CashSessionStatus.CLOSED) {
      throw new BadRequestException('La caja ya está cerrada');
    }

    const salesTotal = await this.salesRepository
      .createQueryBuilder('sale')
      .select('COALESCE(SUM(sale.total), 0)', 'total')
      .where('sale.cash_session_id = :sessionId', { sessionId: id })
      .andWhere('sale.business_id = :businessId', { businessId })
      .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
      .andWhere('sale.payment_method = :paymentMethod', { paymentMethod: PaymentMethod.CASH })
      .getRawOne<{ total: string }>();

    const expectedAmount =
      Number(session.openingAmount) + Number(salesTotal?.total ?? 0);

    session.closingAmount = dto.closingAmount;
    session.expectedAmount = expectedAmount;
    session.notes = dto.notes ?? null;
    session.status = CashSessionStatus.CLOSED;
    session.closedAt = new Date();

    return this.sessionsRepository.save(session);
  }
}
