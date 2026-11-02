import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('business_profiles')
export class BusinessProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'owner_id', unique: true })
  ownerId: string;

  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'tax_id', type: 'varchar', length: 11, nullable: true })
  taxId: string | null;

  @Column({ name: 'legal_name', type: 'varchar', length: 180, nullable: true })
  legalName: string | null;

  @Column({ name: 'trade_name', type: 'varchar', length: 140, nullable: true })
  tradeName: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ name: 'tax_address', type: 'varchar', length: 240, nullable: true })
  taxAddress: string | null;

  @Column({ name: 'legal_representative', type: 'varchar', length: 160, nullable: true })
  legalRepresentative: string | null;

  @Column({ name: 'representative_dni', type: 'varchar', length: 8, nullable: true })
  representativeDni: string | null;

  @Column({ name: 'invoice_series', type: 'varchar', length: 4, default: 'F001' })
  invoiceSeries: string;

  @Column({ name: 'receipt_series', type: 'varchar', length: 4, default: 'B001' })
  receiptSeries: string;

  @Column({ name: 'next_invoice_number', type: 'int', default: 1 })
  nextInvoiceNumber: number;

  @Column({ name: 'next_receipt_number', type: 'int', default: 1 })
  nextReceiptNumber: number;

  @Column({ name: 'nubefact_token_ciphertext', type: 'text', nullable: true })
  nubefactTokenCiphertext: string | null;

  @Column({ name: 'culqi_public_key', type: 'varchar', length: 120, nullable: true })
  culqiPublicKey: string | null;

  @Column({ name: 'culqi_secret_key_ciphertext', type: 'text', nullable: true })
  culqiSecretKeyCiphertext: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
