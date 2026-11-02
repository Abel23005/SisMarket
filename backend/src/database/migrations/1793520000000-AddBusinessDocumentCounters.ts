import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessDocumentCounters1793520000000 implements MigrationInterface {
  name = 'AddBusinessDocumentCounters1793520000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS nubefact_series varchar(4) NULL`);
    await queryRunner.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS nubefact_number integer NULL`);
    await queryRunner.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS nubefact_processing_at timestamp NULL`);
    await queryRunner.query(`ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS next_invoice_number integer NOT NULL DEFAULT 1`);
    await queryRunner.query(`ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS next_receipt_number integer NOT NULL DEFAULT 1`);
    await queryRunner.query(`ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS nubefact_token_ciphertext text NULL`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS nubefact_boleta_number_seq`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS nubefact_factura_number_seq`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE business_profiles DROP COLUMN IF EXISTS next_receipt_number`);
    await queryRunner.query(`ALTER TABLE business_profiles DROP COLUMN IF EXISTS next_invoice_number`);
    await queryRunner.query(`ALTER TABLE business_profiles DROP COLUMN IF EXISTS nubefact_token_ciphertext`);
  }
}
