import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCulqiPayments1793550000000 implements MigrationInterface {
  name = 'AddCulqiPayments1793550000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS culqi_public_key varchar(120) NULL`);
    await queryRunner.query(`ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS culqi_secret_key_ciphertext text NULL`);
    await queryRunner.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS culqi_charge_id varchar(80) NULL`);
    await queryRunner.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS card_last_four varchar(4) NULL`);
    await queryRunner.query(`DO $$ BEGIN ALTER TYPE sales_status_enum ADD VALUE IF NOT EXISTS 'pendiente_pago'; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN ALTER TYPE sales_status_enum ADD VALUE IF NOT EXISTS 'procesando_pago'; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sales DROP COLUMN IF EXISTS card_last_four`);
    await queryRunner.query(`ALTER TABLE sales DROP COLUMN IF EXISTS culqi_charge_id`);
    await queryRunner.query(`ALTER TABLE business_profiles DROP COLUMN IF EXISTS culqi_secret_key_ciphertext`);
    await queryRunner.query(`ALTER TABLE business_profiles DROP COLUMN IF EXISTS culqi_public_key`);
  }
}
