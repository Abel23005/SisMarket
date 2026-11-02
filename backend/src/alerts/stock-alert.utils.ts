import { EntityManager } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { StockAlert } from './entities/stock-alert.entity';

export async function synchronizeStockAlert(
  manager: EntityManager,
  product: Product,
  businessId: string,
) {
  const openAlert = await manager.findOne(StockAlert, {
    where: { productId: product.id, businessId, status: 'open' },
    lock: { mode: 'pessimistic_write' },
  });

  if (product.active && product.stock <= product.minStock) {
    if (!openAlert) {
      await manager.save(manager.create(StockAlert, {
        businessId,
        productId: product.id,
        status: 'open',
        minimumStock: product.minStock,
        stockAtTrigger: product.stock,
        resolutionReason: null,
        resolvedAt: null,
      }));
    } else {
      openAlert.minimumStock = product.minStock;
      openAlert.stockAtTrigger = product.stock;
      await manager.save(openAlert);
    }
    return;
  }

  if (openAlert) {
    openAlert.status = 'resolved';
    openAlert.resolutionReason = 'restocked';
    openAlert.resolvedAt = new Date();
    await manager.save(openAlert);
  }
}
