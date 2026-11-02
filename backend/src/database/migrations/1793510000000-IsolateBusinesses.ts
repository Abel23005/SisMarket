import { MigrationInterface, QueryRunner } from 'typeorm';

export class IsolateBusinesses1793510000000 implements MigrationInterface {
  name = 'IsolateBusinesses1793510000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO business_profiles (owner_id, trade_name)
      SELECT u.id, 'Mi minimarket'
      FROM users u
      WHERE u.role = 'dueno'
        AND NOT EXISTS (SELECT 1 FROM business_profiles b WHERE b.owner_id = u.id)
    `);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS business_id uuid NULL`);
    await queryRunner.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS business_id uuid NULL`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS business_id uuid NULL`);
    await queryRunner.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS business_id uuid NULL`);
    await queryRunner.query(`ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS business_id uuid NULL`);
    await queryRunner.query(`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS business_id uuid NULL`);
    await queryRunner.query(`ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS business_id uuid NULL`);
    await queryRunner.query(`ALTER TABLE team_invitations ADD COLUMN IF NOT EXISTS business_id uuid NULL`);

    await queryRunner.query(`
      UPDATE users u SET business_id = COALESCE(
        (SELECT b.id FROM business_profiles b WHERE b.owner_id = u.id LIMIT 1),
        (SELECT b.id FROM business_profiles b ORDER BY b.created_at, b.id LIMIT 1)
      ) WHERE u.business_id IS NULL
    `);
    await queryRunner.query(`
      UPDATE suppliers s SET business_id = (SELECT b.id FROM business_profiles b ORDER BY b.created_at, b.id LIMIT 1)
      WHERE s.business_id IS NULL
    `);
    await queryRunner.query(`
      UPDATE products p SET business_id = COALESCE(
        (SELECT s.business_id FROM suppliers s WHERE s.id = p.supplier_id),
        (SELECT b.id FROM business_profiles b ORDER BY b.created_at, b.id LIMIT 1)
      ) WHERE p.business_id IS NULL
    `);
    await queryRunner.query(`UPDATE cash_sessions c SET business_id = u.business_id FROM users u WHERE c.cashier_id = u.id AND c.business_id IS NULL`);
    await queryRunner.query(`UPDATE sales s SET business_id = u.business_id FROM users u WHERE s.cashier_id = u.id AND s.business_id IS NULL`);
    await queryRunner.query(`UPDATE purchase_orders p SET business_id = u.business_id FROM users u WHERE p.created_by = u.id AND p.business_id IS NULL`);
    await queryRunner.query(`UPDATE inventory_movements m SET business_id = p.business_id FROM products p WHERE m.product_id = p.id AND m.business_id IS NULL`);
    await queryRunner.query(`
      UPDATE team_invitations i SET business_id = COALESCE(u.business_id, (SELECT b.id FROM business_profiles b ORDER BY b.created_at, b.id LIMIT 1))
      FROM users u WHERE i.created_by = u.id AND i.business_id IS NULL
    `);
    await queryRunner.query(`UPDATE team_invitations SET business_id = (SELECT b.id FROM business_profiles b ORDER BY b.created_at, b.id LIMIT 1) WHERE business_id IS NULL`);

    // Keep pre-existing unassigned rows in a migration-only tenant when there was no owner.
    await queryRunner.query(`
      DO $$ DECLARE bootstrap_owner uuid; BEGIN
        SELECT id INTO bootstrap_owner FROM users ORDER BY created_at, id LIMIT 1;
        IF bootstrap_owner IS NOT NULL AND NOT EXISTS (SELECT 1 FROM business_profiles) THEN
          INSERT INTO business_profiles(owner_id, trade_name) VALUES (bootstrap_owner, 'Mi minimarket');
          UPDATE users SET business_id = (SELECT id FROM business_profiles WHERE owner_id = bootstrap_owner) WHERE business_id IS NULL;
          UPDATE suppliers SET business_id = (SELECT id FROM business_profiles WHERE owner_id = bootstrap_owner) WHERE business_id IS NULL;
          UPDATE products SET business_id = (SELECT id FROM business_profiles WHERE owner_id = bootstrap_owner) WHERE business_id IS NULL;
          UPDATE sales SET business_id = (SELECT id FROM business_profiles WHERE owner_id = bootstrap_owner) WHERE business_id IS NULL;
          UPDATE cash_sessions SET business_id = (SELECT id FROM business_profiles WHERE owner_id = bootstrap_owner) WHERE business_id IS NULL;
          UPDATE purchase_orders SET business_id = (SELECT id FROM business_profiles WHERE owner_id = bootstrap_owner) WHERE business_id IS NULL;
          UPDATE inventory_movements SET business_id = (SELECT id FROM business_profiles WHERE owner_id = bootstrap_owner) WHERE business_id IS NULL;
          UPDATE team_invitations SET business_id = (SELECT id FROM business_profiles WHERE owner_id = bootstrap_owner) WHERE business_id IS NULL;
        END IF;
      END $$
    `);

    for (const table of ['users', 'suppliers', 'products', 'sales', 'cash_sessions', 'purchase_orders', 'inventory_movements', 'team_invitations']) {
      if (table !== 'users') await queryRunner.query(`ALTER TABLE ${table} ALTER COLUMN business_id SET NOT NULL`);
      await queryRunner.query(`ALTER TABLE ${table} ADD CONSTRAINT fk_${table}_business FOREIGN KEY (business_id) REFERENCES business_profiles(id) ON DELETE CASCADE`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_${table}_business_id ON ${table}(business_id)`);
    }
    await queryRunner.query(`
      DO $$ DECLARE constraint_name text; BEGIN
        FOR constraint_name IN
          SELECT c.conname
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
          WHERE t.relname = 'products' AND c.contype = 'u' AND a.attname = 'sku'
            AND array_length(c.conkey, 1) = 1
        LOOP
          EXECUTE format('ALTER TABLE products DROP CONSTRAINT %I', constraint_name);
        END LOOP;
      END $$
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_products_business_sku ON products(business_id, sku)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_products_business_sku`);
    for (const table of ['users', 'suppliers', 'products', 'sales', 'cash_sessions', 'purchase_orders', 'inventory_movements', 'team_invitations']) {
      await queryRunner.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS fk_${table}_business`);
      await queryRunner.query(`DROP INDEX IF EXISTS idx_${table}_business_id`);
      await queryRunner.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS business_id`);
    }
  }
}
