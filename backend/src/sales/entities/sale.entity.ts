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


  @Column({ name: 'nubefact_status', type: 'varchar', length: 30, nullable: true })
  nubefactStatus: string | null;

  @Column({ name: 'nubefact_pdf_url', type: 'text', nullable: true })
  nubefactPdfUrl: string | null;

  @Column({ name: 'nubefact_xml_url', type: 'text', nullable: true })
  nubefactXmlUrl: string | null;

  @Column({ name: 'nubefact_cdr_url', type: 'text', nullable: true })
  nubefactCdrUrl: string | null;

  @Column({ name: 'nubefact_response', type: 'jsonb', nullable: true })
  nubefactResponse: Record<string, unknown> | null;
  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
