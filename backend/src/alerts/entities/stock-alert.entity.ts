import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BusinessProfile } from '../../business/entities/business-profile.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('stock_alerts')
export class StockAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'business_id' })
  businessId: string;

  @ManyToOne(() => BusinessProfile, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: BusinessProfile;

  @Column({ type: 'uuid', name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status: 'open' | 'resolved';

  @Column({ type: 'int', name: 'minimum_stock' })
  minimumStock: number;

  @Column({ type: 'int', name: 'stock_at_trigger' })
  stockAtTrigger: number;

  @Column({ type: 'varchar', length: 24, name: 'resolution_reason', nullable: true })
  resolutionReason: 'restocked' | 'acknowledged' | null;

  @Column({ type: 'timestamp', name: 'resolved_at', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;
}
