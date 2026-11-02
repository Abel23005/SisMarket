import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchasesAndInventoryMovements1793500000000
  implements MigrationInterface
{
  name = 'CreatePurchasesAndInventoryMovements1793500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS document_type varchar(12) NOT NULL DEFAULT 'boleta'`);
    await queryRunner.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_document_type varchar(2) NULL`);
    await queryRunner.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_document_number varchar(15) NULL`);
    await queryRunner.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name varchar(160) NOT NULL DEFAULT 'CONSUMIDOR FINAL'`);
    await queryRunner.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_address varchar(240) NULL`);
    await queryRunner.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_email varchar(120) NULL`);
    await queryRunner.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS nubefact_series varchar(4) NULL`);
    await queryRunner.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS nubefact_number integer NULL`);
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS nubefact_boleta_number_seq START WITH 1`);
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS nubefact_factura_number_seq START WITH 1`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        type varchar(24) NOT NULL CHECK (type IN ('opening', 'sale', 'purchase', 'adjustment', 'return')),
        quantity_change integer NOT NULL CHECK (quantity_change <> 0),
        stock_after integer NOT NULL CHECK (stock_after >= 0),
        reason varchar(240) NULL,
        reference_id uuid NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_created ON inventory_movements(product_id, created_at DESC)`);
    await queryRunner.query(`
      INSERT INTO inventory_movements (product_id, type, quantity_change, stock_after, reason)
      SELECT p.id, 'opening', p.stock, p.stock, 'Stock existente antes del historial'
      FROM products p
      WHERE p.stock > 0
        AND NOT EXISTS (
          SELECT 1 FROM inventory_movements m
          WHERE m.product_id = p.id AND m.type = 'opening'
        )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number varchar(40) NOT NULL UNIQUE,
        supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
        created_by uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled')),
        total numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
        notes text NULL,
        received_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_orders_created ON purchase_orders(created_at DESC)`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity integer NOT NULL CHECK (quantity > 0),
        received_quantity integer NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
        unit_cost numeric(10,2) NOT NULL CHECK (unit_cost >= 0),
        subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
        CONSTRAINT ck_purchase_received_not_over_order CHECK (received_quantity <= quantity)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS business_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        tax_id varchar(11) NULL,
        legal_name varchar(180) NULL,
        trade_name varchar(140) NULL,
        email varchar(120) NULL,
        phone varchar(30) NULL,
        tax_address varchar(240) NULL,
        legal_representative varchar(160) NULL,
        representative_dni varchar(8) NULL,
        invoice_series varchar(4) NOT NULL DEFAULT 'F001',
        receipt_series varchar(4) NOT NULL DEFAULT 'B001',
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS team_invitations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(120) NOT NULL,
        full_name varchar(120) NOT NULL,
        role varchar(20) NOT NULL CHECK (role IN ('cajero', 'almacenero')),
        token_hash char(64) NOT NULL UNIQUE,
        status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
        created_by uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        expires_at timestamp NOT NULL,
        accepted_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_team_invitations_email_status ON team_invitations(email, status)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP SEQUENCE IF EXISTS nubefact_boleta_number_seq');
    await queryRunner.query('DROP SEQUENCE IF EXISTS nubefact_factura_number_seq');
    await queryRunner.query('ALTER TABLE sales DROP COLUMN IF EXISTS nubefact_number');
    await queryRunner.query('ALTER TABLE sales DROP COLUMN IF EXISTS nubefact_series');
    await queryRunner.query('DROP TABLE IF EXISTS business_profiles');
    await queryRunner.query('DROP TABLE IF EXISTS team_invitations');
    await queryRunner.query('DROP TABLE IF EXISTS purchase_order_items');
    await queryRunner.query('DROP TABLE IF EXISTS purchase_orders');
    await queryRunner.query('DROP TABLE IF EXISTS inventory_movements');
  }
}
