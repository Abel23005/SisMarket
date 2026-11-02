import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('auth_audit_logs')
export class AuthAuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'user_id', nullable: true }) userId: string | null;
  @Column({ type: 'uuid', name: 'business_id', nullable: true }) businessId: string | null;
  @Column({ length: 120 }) username: string;
  @Column({ length: 32 }) event: string;
  @Column({ default: false }) successful: boolean;
  @Column({ type: 'inet', nullable: true }) ip: string | null;
  @Column({ name: 'user_agent', type: 'text', nullable: true }) userAgent: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt: Date;
}
