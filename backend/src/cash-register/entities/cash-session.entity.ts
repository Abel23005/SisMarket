import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CashSessionStatus } from '../../common/enums/cash-session-status.enum';
import { User } from '../../users/entities/user.entity';
import { Sale } from '../../sales/entities/sale.entity';

@Entity('cash_sessions')
export class CashSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.cashSessions, { nullable: false })
  @JoinColumn({ name: 'cashier_id' })
  cashier: User;

  @Column({ type: 'uuid', name: 'cashier_id' })
  cashierId: string;

  @Column({
    name: 'opening_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  openingAmount: number;

  @Column({
    name: 'closing_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  closingAmount: number | null;

  @Column({
    name: 'expected_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  expectedAmount: number | null;

  @Column({
    type: 'enum',
    enum: CashSessionStatus,
    default: CashSessionStatus.OPEN,
  })
  status: CashSessionStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => Sale, (sale) => sale.cashSession)
  sales: Sale[];

  @CreateDateColumn({ name: 'opened_at' })
  openedAt: Date;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;
}
