import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockAlert } from './entities/stock-alert.entity';

@Injectable()
export class AlertsService {
  constructor(@InjectRepository(StockAlert) private readonly alerts: Repository<StockAlert>) {}

  findOpen(businessId: string) {
    return this.alerts.find({
      where: { businessId, status: 'open' },
      relations: { product: true },
      order: { createdAt: 'DESC' },
    });
  }

  findHistory(businessId: string) {
    return this.alerts.find({
      where: { businessId, status: 'resolved' },
      relations: { product: true },
      order: { resolvedAt: 'DESC' },
      take: 100,
    });
  }

  async acknowledge(id: string, businessId: string) {
    const alert = await this.alerts.findOne({ where: { id, businessId, status: 'open' } });
    if (!alert) throw new NotFoundException('Alerta pendiente no encontrada');
    alert.status = 'resolved';
    alert.resolutionReason = 'acknowledged';
    alert.resolvedAt = new Date();
    return this.alerts.save(alert);
  }
}
