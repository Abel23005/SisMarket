import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('auth_sessions')
@Index('uq_auth_sessions_jti', ['jti'], { unique: true })
export class AuthSession {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'user_id' }) userId: string;
  @Column({ type: 'uuid', name: 'business_id' }) businessId: string;
  @Column({ length: 80 }) jti: string;
  @Column({ type: 'inet', nullable: true }) ip: string | null;
  @Column({ name: 'user_agent', type: 'text', nullable: true }) userAgent: string | null;
  @Column({ name: 'expires_at', type: 'timestamp' }) expiresAt: Date;
  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true }) revokedAt: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt: Date;
}
