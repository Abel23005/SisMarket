import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline for existing local installations and for clean production databases.
 * IF NOT EXISTS keeps existing user data intact when the app is first migrated.
 */
export class CreateBaseSchema1793490000000 implements MigrationInterface {
  name = 'CreateBaseSchema1793490000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE users_role_enum AS ENUM ('dueno', 'cajero', 'almacenero');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE sales_payment_method_enum AS ENUM ('efectivo', 'tarjeta', 'yape', 'plin');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE sales_status_enum AS ENUM ('completada', 'anulada');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE cash_sessions_status_enum AS ENUM ('abierta', 'cerrada');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username varchar(80) NOT NULL UNIQUE,
        email varchar(120) NOT NULL,
        password_hash varchar NOT NULL,
        full_name varchar(120) NOT NULL,
        role users_role_enum NOT NULL DEFAULT 'cajero',
        active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(140) NOT NULL,
        contact varchar(120) NOT NULL,
        email varchar(160) NULL,
        phone varchar(40) NULL,
        last_order date NULL,
        monthly_total numeric(10,2) NOT NULL DEFAULT 0,
        active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) NOT NULL,
        sku varchar(50) NOT NULL UNIQUE,
        barcode varchar(50) NULL,
        price numeric(10,2) NOT NULL,
        stock integer NOT NULL DEFAULT 0,
        min_stock integer NOT NULL DEFAULT 5,
        category varchar(80) NULL,
        image_url varchar NULL,
        supplier_id uuid NULL REFERENCES suppliers(id) ON DELETE SET NULL,
        active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cash_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        cashier_id uuid NOT NULL REFERENCES users(id),
        opening_amount numeric(10,2) NOT NULL,
        closing_amount numeric(10,2) NULL,
        expected_amount numeric(10,2) NULL,
        status cash_sessions_status_enum NOT NULL DEFAULT 'abierta',
        notes text NULL,
        opened_at timestamp NOT NULL DEFAULT now(),
        closed_at timestamp NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_number varchar NOT NULL UNIQUE,
        cashier_id uuid NOT NULL REFERENCES users(id),
        cash_session_id uuid NULL REFERENCES cash_sessions(id),
        subtotal numeric(10,2) NOT NULL,
        tax numeric(10,2) NOT NULL DEFAULT 0,
        total numeric(10,2) NOT NULL,
        payment_method sales_payment_method_enum NOT NULL DEFAULT 'efectivo',
        status sales_status_enum NOT NULL DEFAULT 'completada',
        nubefact_status varchar(30) NULL,
        nubefact_pdf_url text NULL,
        nubefact_xml_url text NULL,
        nubefact_cdr_url text NULL,
        nubefact_response jsonb NULL,
        document_type varchar(12) NOT NULL DEFAULT 'boleta',
        customer_document_type varchar(2) NULL,
        customer_document_number varchar(15) NULL,
        customer_name varchar(160) NOT NULL DEFAULT 'CONSUMIDOR FINAL',
        customer_address varchar(240) NULL,
        customer_email varchar(120) NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES products(id),
        quantity integer NOT NULL,
        unit_price numeric(10,2) NOT NULL,
        subtotal numeric(10,2) NOT NULL
      )
    `);
  }

  async down(): Promise<void> {
    // The baseline is intentionally irreversible: it may have been applied to a database with live data.
  }
}
