import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 140 })
  name: string;

  @Column({ length: 120 })
  contact: string;

  @Column({ length: 160, nullable: true })
  email: string | null;

  @Column({ length: 40, nullable: true })
  phone: string | null;

  @Column({ name: 'last_order', type: 'date', nullable: true })
  lastOrder: string | null;

  @Column({
    name: 'monthly_total',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  monthlyTotal: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
