import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { SaleStatus } from '../../common/enums/sale-status.enum';
import { User } from '../../users/entities/user.entity';
import { CashSession } from '../../cash-register/entities/cash-session.entity';
import { SaleItem } from './sale-item.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'business_id' })
  businessId: string;

  @Column({ name: 'ticket_number', unique: true })
  ticketNumber: string;

  @ManyToOne(() => User, (user) => user.sales, { nullable: false })
  @JoinColumn({ name: 'cashier_id' })
  cashier: User;

  @Column({ type: 'uuid', name: 'cashier_id' })
  cashierId: string;

  @ManyToOne(() => CashSession, (session) => session.sales, {
    nullable: true,
  })
  @JoinColumn({ name: 'cash_session_id' })
  cashSession: CashSession | null;

  @Column({ type: 'uuid', name: 'cash_session_id', nullable: true })
  cashSessionId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    name: 'payment_method',
    default: PaymentMethod.CASH,
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: SaleStatus,
    default: SaleStatus.COMPLETED,
  })
  status: SaleStatus;

  @Column({ name: 'culqi_charge_id', type: 'varchar', length: 80, nullable: true })
  culqiChargeId: string | null;

  @Column({ name: 'card_last_four', type: 'varchar', length: 4, nullable: true })
  cardLastFour: string | null;


  @Column({ name: 'nubefact_status', type: 'varchar', length: 30, nullable: true })
  nubefactStatus: string | null;

  @Column({ name: 'nubefact_series', type: 'varchar', length: 4, nullable: true })
  nubefactSeries: string | null;

  @Column({ name: 'nubefact_number', type: 'int', nullable: true })
  nubefactNumber: number | null;

  @Column({ name: 'nubefact_processing_at', type: 'timestamp', nullable: true })
  nubefactProcessingAt: Date | null;

  @Column({ name: 'nubefact_pdf_url', type: 'text', nullable: true })
  nubefactPdfUrl: string | null;

  @Column({ name: 'nubefact_xml_url', type: 'text', nullable: true })
  nubefactXmlUrl: string | null;

  @Column({ name: 'nubefact_cdr_url', type: 'text', nullable: true })
  nubefactCdrUrl: string | null;

  @Column({ name: 'nubefact_response', type: 'jsonb', nullable: true })
  nubefactResponse: Record<string, unknown> | null;

  @Column({ name: 'document_type', type: 'varchar', length: 12, default: 'boleta' })
  documentType: 'boleta' | 'factura';

  @Column({ name: 'customer_document_type', type: 'varchar', length: 2, nullable: true })
  customerDocumentType: string | null;

  @Column({ name: 'customer_document_number', type: 'varchar', length: 15, nullable: true })
  customerDocumentNumber: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 160, default: 'CONSUMIDOR FINAL' })
  customerName: string;

  @Column({ name: 'customer_address', type: 'varchar', length: 240, nullable: true })
  customerAddress: string | null;

  @Column({ name: 'customer_email', type: 'varchar', length: 120, nullable: true })
  customerEmail: string | null;
  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
