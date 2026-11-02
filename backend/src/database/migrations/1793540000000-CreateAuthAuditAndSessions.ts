import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthAuditAndSessions1793540000000 implements MigrationInterface {
  name = 'CreateAuthAuditAndSessions1793540000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS auth_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      business_id uuid NOT NULL, jti varchar(80) NOT NULL UNIQUE, ip inet NULL, user_agent text NULL,
      expires_at timestamp NOT NULL, revoked_at timestamp NULL, created_at timestamp NOT NULL DEFAULT now()
    )`);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active ON auth_sessions(user_id, expires_at) WHERE revoked_at IS NULL');
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS auth_audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
      business_id uuid NULL, username varchar(120) NOT NULL, event varchar(32) NOT NULL, successful boolean NOT NULL DEFAULT false,
      ip inet NULL, user_agent text NULL, created_at timestamp NOT NULL DEFAULT now()
    )`);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_business_date ON auth_audit_logs(business_id, created_at DESC)');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS auth_audit_logs');
    await queryRunner.query('DROP TABLE IF EXISTS auth_sessions');
  }
}
