import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'business_id' })
  businessId: string;

  @Column({ length: 140 })
  name: string;

  @Column({ length: 120 })
  contact: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
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

  @OneToMany(() => Product, (product) => product.supplier)
  products: Product[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
