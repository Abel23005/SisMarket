import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { Sale } from '../../sales/entities/sale.entity';
import { CashSession } from '../../cash-register/entities/cash-session.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 80 })
  username: string;

  @Column({ length: 120 })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name', length: 120 })
  fullName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CASHIER })
  role: UserRole;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => Sale, (sale) => sale.cashier)
  sales: Sale[];

  @OneToMany(() => CashSession, (session) => session.cashier)
  cashSessions: CashSession[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
