import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('saas_subscriptions')
@Index('idx_saas_subscriptions_business_created', ['businessId', 'createdAt'])
@Index('uq_saas_subscriptions_culqi_id', ['culqiSubscriptionId'], { unique: true })
export class SaasSubscription {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'business_id' }) businessId: string;
  @Column({ name: 'plan_code', length: 24 }) planCode: string;
  @Column({ type: 'numeric', precision: 8, scale: 2 }) amount: string;
  @Column({ length: 3, default: 'PEN' }) currency: string;
  @Column({ length: 24, default: 'creating' }) status: string;
  @Column({ name: 'culqi_subscription_id', type: 'varchar', length: 80, nullable: true }) culqiSubscriptionId: string | null;
  @Column({ name: 'culqi_customer_id', type: 'varchar', length: 80, nullable: true }) culqiCustomerId: string | null;
  @Column({ name: 'culqi_card_id', type: 'varchar', length: 80, nullable: true }) culqiCardId: string | null;
  @Column({ name: 'next_billing_at', type: 'timestamp', nullable: true }) nextBillingAt: Date | null;
  @Column({ name: 'started_at', type: 'timestamp', nullable: true }) startedAt: Date | null;
  @Column({ name: 'ended_at', type: 'timestamp', nullable: true }) endedAt: Date | null;
  @Column({ name: 'last_event', type: 'varchar', length: 60, nullable: true }) lastEvent: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt: Date;
}
