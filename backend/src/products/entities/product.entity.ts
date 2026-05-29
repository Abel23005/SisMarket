import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SaleItem } from '../../sales/entities/sale-item.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ unique: true, length: 50 })
  sku: string;

  @Column({ type: 'varchar', nullable: true, length: 50 })
  barcode: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', name: 'min_stock', default: 5 })
  minStock: number;

  @Column({ type: 'varchar', length: 80, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', name: 'image_url', nullable: true })
  imageUrl: string | null;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => SaleItem, (item) => item.product)
  saleItems: SaleItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
