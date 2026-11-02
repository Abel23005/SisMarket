import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupabaseAuthIdentity1793580000000 implements MigrationInterface {
  name = 'AddSupabaseAuthIdentity1793580000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id uuid NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_users_auth_user_id ON users(auth_user_id) WHERE auth_user_id IS NOT NULL`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`);
  }

  async down(): Promise<void> {
    throw new Error('AddSupabaseAuthIdentity is irreversible: linked users may no longer have local password hashes.');
  }
}
