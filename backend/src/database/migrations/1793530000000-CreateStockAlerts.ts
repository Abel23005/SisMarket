import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStockAlerts1793530000000 implements MigrationInterface {
  name = 'CreateStockAlerts1793530000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_alerts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        status varchar(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
        minimum_stock integer NOT NULL CHECK (minimum_stock >= 0),
        stock_at_trigger integer NOT NULL CHECK (stock_at_trigger >= 0),
        resolution_reason varchar(24) NULL CHECK (resolution_reason IN ('restocked', 'acknowledged')),
        resolved_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_alerts_open_product ON stock_alerts(business_id, product_id) WHERE status = 'open'`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_stock_alerts_business_status_date ON stock_alerts(business_id, status, created_at DESC)`);
    await queryRunner.query(`
      INSERT INTO stock_alerts (business_id, product_id, minimum_stock, stock_at_trigger)
      SELECT p.business_id, p.id, p.min_stock, p.stock
      FROM products p
      WHERE p.active = true AND p.stock <= p.min_stock
        AND NOT EXISTS (
          SELECT 1 FROM stock_alerts a WHERE a.business_id = p.business_id AND a.product_id = p.id AND a.status = 'open'
        )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS stock_alerts');
  }
}
