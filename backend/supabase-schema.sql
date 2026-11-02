-- SisMarket Supabase schema generated from ordered TypeORM migrations.
-- Run once in Supabase SQL Editor on the new project. Does not copy local rows.

-- CreateBaseSchema1793490000000

DO $$ BEGIN
        CREATE TYPE users_role_enum AS ENUM ('dueno', 'cajero', 'almacenero');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
        CREATE TYPE sales_payment_method_enum AS ENUM ('efectivo', 'tarjeta', 'yape', 'plin');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
        CREATE TYPE sales_status_enum AS ENUM ('completada', 'anulada');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
        CREATE TYPE cash_sessions_status_enum AS ENUM ('abierta', 'cerrada');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
      );

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
      );

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
      );

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
      );

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
      );

CREATE TABLE IF NOT EXISTS sale_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES products(id),
        quantity integer NOT NULL,
        unit_price numeric(10,2) NOT NULL,
        subtotal numeric(10,2) NOT NULL
      );

-- CreatePurchasesAndInventoryMovements1793500000000

ALTER TABLE sales ADD COLUMN IF NOT EXISTS document_type varchar(12) NOT NULL DEFAULT 'boleta';

ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_document_type varchar(2) NULL;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_document_number varchar(15) NULL;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name varchar(160) NOT NULL DEFAULT 'CONSUMIDOR FINAL';

ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_address varchar(240) NULL;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_email varchar(120) NULL;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS nubefact_series varchar(4) NULL;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS nubefact_number integer NULL;

CREATE SEQUENCE IF NOT EXISTS nubefact_boleta_number_seq START WITH 1;

CREATE SEQUENCE IF NOT EXISTS nubefact_factura_number_seq START WITH 1;

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
      );

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_created ON inventory_movements(product_id, created_at DESC);

INSERT INTO inventory_movements (product_id, type, quantity_change, stock_after, reason)
      SELECT p.id, 'opening', p.stock, p.stock, 'Stock existente antes del historial'
      FROM products p
      WHERE p.stock > 0
        AND NOT EXISTS (
          SELECT 1 FROM inventory_movements m
          WHERE m.product_id = p.id AND m.type = 'opening'
        );

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
      );

CREATE INDEX IF NOT EXISTS idx_purchase_orders_created ON purchase_orders(created_at DESC);

CREATE TABLE IF NOT EXISTS purchase_order_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity integer NOT NULL CHECK (quantity > 0),
        received_quantity integer NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
        unit_cost numeric(10,2) NOT NULL CHECK (unit_cost >= 0),
        subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
        CONSTRAINT ck_purchase_received_not_over_order CHECK (received_quantity <= quantity)
      );

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
      );

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
      );

CREATE INDEX IF NOT EXISTS idx_team_invitations_email_status ON team_invitations(email, status);

-- IsolateBusinesses1793510000000

INSERT INTO business_profiles (owner_id, trade_name)
      SELECT u.id, 'Mi minimarket'
      FROM users u
      WHERE u.role = 'dueno'
        AND NOT EXISTS (SELECT 1 FROM business_profiles b WHERE b.owner_id = u.id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS business_id uuid NULL;

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS business_id uuid NULL;

ALTER TABLE products ADD COLUMN IF NOT EXISTS business_id uuid NULL;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS business_id uuid NULL;

ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS business_id uuid NULL;

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS business_id uuid NULL;

ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS business_id uuid NULL;

ALTER TABLE team_invitations ADD COLUMN IF NOT EXISTS business_id uuid NULL;

UPDATE users u SET business_id = COALESCE(
        (SELECT b.id FROM business_profiles b WHERE b.owner_id = u.id LIMIT 1),
        (SELECT b.id FROM business_profiles b ORDER BY b.created_at, b.id LIMIT 1)
      ) WHERE u.business_id IS NULL;

UPDATE suppliers s SET business_id = (SELECT b.id FROM business_profiles b ORDER BY b.created_at, b.id LIMIT 1)
      WHERE s.business_id IS NULL;

UPDATE products p SET business_id = COALESCE(
        (SELECT s.business_id FROM suppliers s WHERE s.id = p.supplier_id),
        (SELECT b.id FROM business_profiles b ORDER BY b.created_at, b.id LIMIT 1)
      ) WHERE p.business_id IS NULL;

UPDATE cash_sessions c SET business_id = u.business_id FROM users u WHERE c.cashier_id = u.id AND c.business_id IS NULL;

UPDATE sales s SET business_id = u.business_id FROM users u WHERE s.cashier_id = u.id AND s.business_id IS NULL;

UPDATE purchase_orders p SET business_id = u.business_id FROM users u WHERE p.created_by = u.id AND p.business_id IS NULL;

UPDATE inventory_movements m SET business_id = p.business_id FROM products p WHERE m.product_id = p.id AND m.business_id IS NULL;

UPDATE team_invitations i SET business_id = COALESCE(u.business_id, (SELECT b.id FROM business_profiles b ORDER BY b.created_at, b.id LIMIT 1))
      FROM users u WHERE i.created_by = u.id AND i.business_id IS NULL;

UPDATE team_invitations SET business_id = (SELECT b.id FROM business_profiles b ORDER BY b.created_at, b.id LIMIT 1) WHERE business_id IS NULL;

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
      END $$;

ALTER TABLE users ADD CONSTRAINT fk_users_business FOREIGN KEY (business_id) REFERENCES business_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_users_business_id ON users(business_id);

ALTER TABLE suppliers ALTER COLUMN business_id SET NOT NULL;

ALTER TABLE suppliers ADD CONSTRAINT fk_suppliers_business FOREIGN KEY (business_id) REFERENCES business_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_suppliers_business_id ON suppliers(business_id);

ALTER TABLE products ALTER COLUMN business_id SET NOT NULL;

ALTER TABLE products ADD CONSTRAINT fk_products_business FOREIGN KEY (business_id) REFERENCES business_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);

ALTER TABLE sales ALTER COLUMN business_id SET NOT NULL;

ALTER TABLE sales ADD CONSTRAINT fk_sales_business FOREIGN KEY (business_id) REFERENCES business_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sales_business_id ON sales(business_id);

ALTER TABLE cash_sessions ALTER COLUMN business_id SET NOT NULL;

ALTER TABLE cash_sessions ADD CONSTRAINT fk_cash_sessions_business FOREIGN KEY (business_id) REFERENCES business_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_cash_sessions_business_id ON cash_sessions(business_id);

ALTER TABLE purchase_orders ALTER COLUMN business_id SET NOT NULL;

ALTER TABLE purchase_orders ADD CONSTRAINT fk_purchase_orders_business FOREIGN KEY (business_id) REFERENCES business_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_business_id ON purchase_orders(business_id);

ALTER TABLE inventory_movements ALTER COLUMN business_id SET NOT NULL;

ALTER TABLE inventory_movements ADD CONSTRAINT fk_inventory_movements_business FOREIGN KEY (business_id) REFERENCES business_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_inventory_movements_business_id ON inventory_movements(business_id);

ALTER TABLE team_invitations ALTER COLUMN business_id SET NOT NULL;

ALTER TABLE team_invitations ADD CONSTRAINT fk_team_invitations_business FOREIGN KEY (business_id) REFERENCES business_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_team_invitations_business_id ON team_invitations(business_id);

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
      END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_business_sku ON products(business_id, sku);

-- AddBusinessDocumentCounters1793520000000

ALTER TABLE sales ADD COLUMN IF NOT EXISTS nubefact_series varchar(4) NULL;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS nubefact_number integer NULL;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS nubefact_processing_at timestamp NULL;

ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS next_invoice_number integer NOT NULL DEFAULT 1;

ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS next_receipt_number integer NOT NULL DEFAULT 1;

ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS nubefact_token_ciphertext text NULL;

DROP SEQUENCE IF EXISTS nubefact_boleta_number_seq;

DROP SEQUENCE IF EXISTS nubefact_factura_number_seq;

-- CreateStockAlerts1793530000000

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
      );

CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_alerts_open_product ON stock_alerts(business_id, product_id) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_stock_alerts_business_status_date ON stock_alerts(business_id, status, created_at DESC);

INSERT INTO stock_alerts (business_id, product_id, minimum_stock, stock_at_trigger)
      SELECT p.business_id, p.id, p.min_stock, p.stock
      FROM products p
      WHERE p.active = true AND p.stock <= p.min_stock
        AND NOT EXISTS (
          SELECT 1 FROM stock_alerts a WHERE a.business_id = p.business_id AND a.product_id = p.id AND a.status = 'open'
        );

-- CreateAuthAuditAndSessions1793540000000

CREATE TABLE IF NOT EXISTS auth_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      business_id uuid NOT NULL, jti varchar(80) NOT NULL UNIQUE, ip inet NULL, user_agent text NULL,
      expires_at timestamp NOT NULL, revoked_at timestamp NULL, created_at timestamp NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active ON auth_sessions(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
      business_id uuid NULL, username varchar(120) NOT NULL, event varchar(32) NOT NULL, successful boolean NOT NULL DEFAULT false,
      ip inet NULL, user_agent text NULL, created_at timestamp NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_business_date ON auth_audit_logs(business_id, created_at DESC);

-- AddCulqiPayments1793550000000

ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS culqi_public_key varchar(120) NULL;

ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS culqi_secret_key_ciphertext text NULL;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS culqi_charge_id varchar(80) NULL;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS card_last_four varchar(4) NULL;

DO $$ BEGIN ALTER TYPE sales_status_enum ADD VALUE IF NOT EXISTS 'pendiente_pago'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TYPE sales_status_enum ADD VALUE IF NOT EXISTS 'procesando_pago'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateSaasSubscriptions1793560000000

CREATE TABLE IF NOT EXISTS saas_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
      plan_code varchar(24) NOT NULL, amount numeric(8,2) NOT NULL, currency varchar(3) NOT NULL DEFAULT 'PEN',
      status varchar(24) NOT NULL DEFAULT 'creating', culqi_subscription_id varchar(80) NULL UNIQUE,
      culqi_customer_id varchar(80) NULL, culqi_card_id varchar(80) NULL, next_billing_at timestamp NULL,
      started_at timestamp NULL, ended_at timestamp NULL, last_event varchar(60) NULL,
      created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_business_created ON saas_subscriptions(business_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_saas_subscriptions_one_current ON saas_subscriptions(business_id) WHERE status IN ('creating','pending','active','past_due');

-- EnableTenantRowSecurity1793570000000

CREATE OR REPLACE FUNCTION public.sismarket_context() RETURNS jsonb
      LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public
      AS $$ SELECT COALESCE(NULLIF(current_setting('app.sismarket_context', true), '')::jsonb, '{}'::jsonb) $$;

CREATE OR REPLACE FUNCTION public.sismarket_business_id() RETURNS uuid
      LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public
      AS $$ SELECT NULLIF(public.sismarket_context() ->> 'business_id', '')::uuid $$;

CREATE OR REPLACE FUNCTION public.sismarket_user_id() RETURNS uuid
      LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public
      AS $$ SELECT NULLIF(public.sismarket_context() ->> 'sub', '')::uuid $$;

CREATE OR REPLACE FUNCTION public.sismarket_role() RETURNS text
      LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public
      AS $$ SELECT public.sismarket_context() ->> 'app_role' $$;

CREATE OR REPLACE FUNCTION public.sismarket_is_auth_operation() RETURNS boolean
      LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public
      AS $$ SELECT COALESCE((public.sismarket_context() ->> 'auth_operation')::boolean, false) $$;

CREATE OR REPLACE FUNCTION public.sismarket_is_system_operation() RETURNS boolean
      LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public
      AS $$ SELECT COALESCE((public.sismarket_context() ->> 'system_operation')::boolean, false) $$;

GRANT EXECUTE ON FUNCTION public.sismarket_context(), public.sismarket_business_id(), public.sismarket_user_id(), public.sismarket_role(), public.sismarket_is_auth_operation(), public.sismarket_is_system_operation() TO PUBLIC;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.products FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sales FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sale_items FORCE ROW LEVEL SECURITY;

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cash_sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.suppliers FORCE ROW LEVEL SECURITY;

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.inventory_movements FORCE ROW LEVEL SECURITY;

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.purchase_orders FORCE ROW LEVEL SECURITY;

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.purchase_order_items FORCE ROW LEVEL SECURITY;

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.team_invitations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.stock_alerts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auth_sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.auth_audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auth_audit_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.saas_subscriptions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_read_self_or_business ON public.users;

CREATE POLICY users_read_self_or_business ON public.users FOR SELECT USING (public.sismarket_is_system_operation() OR (public.sismarket_is_auth_operation() OR id = public.sismarket_user_id() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno')));

DROP POLICY IF EXISTS users_insert_owner_or_auth ON public.users;

CREATE POLICY users_insert_owner_or_auth ON public.users FOR INSERT WITH CHECK (public.sismarket_is_system_operation() OR (public.sismarket_is_auth_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno')));

DROP POLICY IF EXISTS users_update_owner_or_auth ON public.users;

CREATE POLICY users_update_owner_or_auth ON public.users FOR UPDATE USING (public.sismarket_is_system_operation() OR (public.sismarket_is_auth_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno'))) WITH CHECK (public.sismarket_is_system_operation() OR (public.sismarket_is_auth_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno')));

DROP POLICY IF EXISTS business_profiles_read_tenant ON public.business_profiles;

CREATE POLICY business_profiles_read_tenant ON public.business_profiles FOR SELECT USING (public.sismarket_is_system_operation() OR (id = public.sismarket_business_id() OR public.sismarket_is_auth_operation()));

DROP POLICY IF EXISTS business_profiles_insert_auth ON public.business_profiles;

CREATE POLICY business_profiles_insert_auth ON public.business_profiles FOR INSERT WITH CHECK (public.sismarket_is_system_operation() OR (public.sismarket_is_auth_operation()));

DROP POLICY IF EXISTS business_profiles_update_owner_or_cashier ON public.business_profiles;

CREATE POLICY business_profiles_update_owner_or_cashier ON public.business_profiles FOR UPDATE USING (public.sismarket_is_system_operation() OR (id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'cajero'))) WITH CHECK (public.sismarket_is_system_operation() OR (id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'cajero')));

DROP POLICY IF EXISTS products_read_tenant ON public.products;

CREATE POLICY products_read_tenant ON public.products FOR SELECT USING (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id()));

DROP POLICY IF EXISTS products_write_managers ON public.products;

CREATE POLICY products_write_managers ON public.products FOR INSERT WITH CHECK (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero')));

DROP POLICY IF EXISTS products_update_managers ON public.products;

CREATE POLICY products_update_managers ON public.products FOR UPDATE USING (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero'))) WITH CHECK (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero')));

DROP POLICY IF EXISTS sales_read_owner_or_cashier ON public.sales;

CREATE POLICY sales_read_owner_or_cashier ON public.sales FOR SELECT USING (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND (public.sismarket_role() = 'dueno' OR cashier_id = public.sismarket_user_id())));

DROP POLICY IF EXISTS sales_insert_owner_or_cashier ON public.sales;

CREATE POLICY sales_insert_owner_or_cashier ON public.sales FOR INSERT WITH CHECK (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND cashier_id = public.sismarket_user_id() AND public.sismarket_role() IN ('dueno', 'cajero')));

DROP POLICY IF EXISTS sales_update_owner_or_cashier ON public.sales;

CREATE POLICY sales_update_owner_or_cashier ON public.sales FOR UPDATE USING (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND (public.sismarket_role() = 'dueno' OR (public.sismarket_role() = 'cajero' AND cashier_id = public.sismarket_user_id())))) WITH CHECK (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND (public.sismarket_role() = 'dueno' OR (public.sismarket_role() = 'cajero' AND cashier_id = public.sismarket_user_id()))));

DROP POLICY IF EXISTS sale_items_read_parent_sale ON public.sale_items;

CREATE POLICY sale_items_read_parent_sale ON public.sale_items FOR SELECT USING (public.sismarket_is_system_operation() OR (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id)));

DROP POLICY IF EXISTS sale_items_insert_parent_sale ON public.sale_items;

CREATE POLICY sale_items_insert_parent_sale ON public.sale_items FOR INSERT WITH CHECK (public.sismarket_is_system_operation() OR (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.business_id = public.sismarket_business_id() AND (public.sismarket_role() = 'dueno' OR (public.sismarket_role() = 'cajero' AND s.cashier_id = public.sismarket_user_id())))));

DROP POLICY IF EXISTS cash_sessions_read_owner_or_cashier ON public.cash_sessions;

CREATE POLICY cash_sessions_read_owner_or_cashier ON public.cash_sessions FOR SELECT USING (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND (public.sismarket_role() = 'dueno' OR cashier_id = public.sismarket_user_id())));

DROP POLICY IF EXISTS cash_sessions_insert_owner_or_cashier ON public.cash_sessions;

CREATE POLICY cash_sessions_insert_owner_or_cashier ON public.cash_sessions FOR INSERT WITH CHECK (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND cashier_id = public.sismarket_user_id() AND public.sismarket_role() IN ('dueno', 'cajero')));

DROP POLICY IF EXISTS cash_sessions_update_owner_or_cashier ON public.cash_sessions;

CREATE POLICY cash_sessions_update_owner_or_cashier ON public.cash_sessions FOR UPDATE USING (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND (public.sismarket_role() = 'dueno' OR (public.sismarket_role() = 'cajero' AND cashier_id = public.sismarket_user_id())))) WITH CHECK (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND (public.sismarket_role() = 'dueno' OR (public.sismarket_role() = 'cajero' AND cashier_id = public.sismarket_user_id()))));

DROP POLICY IF EXISTS suppliers_tenant_managers ON public.suppliers;

CREATE POLICY suppliers_tenant_managers ON public.suppliers FOR ALL USING (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero'))) WITH CHECK (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero')));

DROP POLICY IF EXISTS inventory_movements_read_managers ON public.inventory_movements;

CREATE POLICY inventory_movements_read_managers ON public.inventory_movements FOR SELECT USING (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero')));

DROP POLICY IF EXISTS inventory_movements_insert_operations ON public.inventory_movements;

CREATE POLICY inventory_movements_insert_operations ON public.inventory_movements FOR INSERT WITH CHECK (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'cajero', 'almacenero')));

DROP POLICY IF EXISTS purchase_orders_tenant_managers ON public.purchase_orders;

CREATE POLICY purchase_orders_tenant_managers ON public.purchase_orders FOR ALL USING (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero'))) WITH CHECK (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero')));

DROP POLICY IF EXISTS purchase_order_items_read_parent ON public.purchase_order_items;

CREATE POLICY purchase_order_items_read_parent ON public.purchase_order_items FOR SELECT USING (public.sismarket_is_system_operation() OR (EXISTS (SELECT 1 FROM public.purchase_orders p WHERE p.id = purchase_order_id)));

DROP POLICY IF EXISTS purchase_order_items_write_parent ON public.purchase_order_items;

CREATE POLICY purchase_order_items_write_parent ON public.purchase_order_items FOR INSERT WITH CHECK (public.sismarket_is_system_operation() OR (EXISTS (SELECT 1 FROM public.purchase_orders p WHERE p.id = purchase_order_id AND p.business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero'))));

DROP POLICY IF EXISTS purchase_order_items_update_parent ON public.purchase_order_items;

CREATE POLICY purchase_order_items_update_parent ON public.purchase_order_items FOR UPDATE USING (public.sismarket_is_system_operation() OR (EXISTS (SELECT 1 FROM public.purchase_orders p WHERE p.id = purchase_order_id AND p.business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero')))) WITH CHECK (public.sismarket_is_system_operation() OR (EXISTS (SELECT 1 FROM public.purchase_orders p WHERE p.id = purchase_order_id AND p.business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero'))));

DROP POLICY IF EXISTS team_invitations_select_owner_or_auth ON public.team_invitations;

CREATE POLICY team_invitations_select_owner_or_auth ON public.team_invitations FOR SELECT USING (public.sismarket_is_system_operation() OR (public.sismarket_is_auth_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno')));

DROP POLICY IF EXISTS team_invitations_insert_owner ON public.team_invitations;

CREATE POLICY team_invitations_insert_owner ON public.team_invitations FOR INSERT WITH CHECK (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno'));

DROP POLICY IF EXISTS team_invitations_update_owner_or_auth ON public.team_invitations;

CREATE POLICY team_invitations_update_owner_or_auth ON public.team_invitations FOR UPDATE USING (public.sismarket_is_system_operation() OR (public.sismarket_is_auth_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno'))) WITH CHECK (public.sismarket_is_system_operation() OR (public.sismarket_is_auth_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno')));

DROP POLICY IF EXISTS stock_alerts_tenant_operations ON public.stock_alerts;

CREATE POLICY stock_alerts_tenant_operations ON public.stock_alerts FOR SELECT USING (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'cajero', 'almacenero')));

DROP POLICY IF EXISTS stock_alerts_insert_operations ON public.stock_alerts;

CREATE POLICY stock_alerts_insert_operations ON public.stock_alerts FOR INSERT WITH CHECK (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'cajero', 'almacenero')));

DROP POLICY IF EXISTS stock_alerts_update_operations ON public.stock_alerts;

CREATE POLICY stock_alerts_update_operations ON public.stock_alerts FOR UPDATE USING (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'cajero', 'almacenero'))) WITH CHECK (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'cajero', 'almacenero')));

DROP POLICY IF EXISTS auth_sessions_read_self ON public.auth_sessions;

CREATE POLICY auth_sessions_read_self ON public.auth_sessions FOR SELECT USING (public.sismarket_is_system_operation() OR (public.sismarket_is_auth_operation() OR user_id = public.sismarket_user_id()));

DROP POLICY IF EXISTS auth_sessions_insert_self ON public.auth_sessions;

CREATE POLICY auth_sessions_insert_self ON public.auth_sessions FOR INSERT WITH CHECK (public.sismarket_is_system_operation() OR (public.sismarket_is_auth_operation() OR (user_id = public.sismarket_user_id() AND business_id = public.sismarket_business_id())));

DROP POLICY IF EXISTS auth_sessions_update_self ON public.auth_sessions;

CREATE POLICY auth_sessions_update_self ON public.auth_sessions FOR UPDATE USING (public.sismarket_is_system_operation() OR (user_id = public.sismarket_user_id() AND business_id = public.sismarket_business_id())) WITH CHECK (public.sismarket_is_system_operation() OR (user_id = public.sismarket_user_id() AND business_id = public.sismarket_business_id()));

DROP POLICY IF EXISTS auth_audit_logs_read_owner ON public.auth_audit_logs;

CREATE POLICY auth_audit_logs_read_owner ON public.auth_audit_logs FOR SELECT USING (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno'));

DROP POLICY IF EXISTS auth_audit_logs_insert_request ON public.auth_audit_logs;

CREATE POLICY auth_audit_logs_insert_request ON public.auth_audit_logs FOR INSERT WITH CHECK (public.sismarket_is_system_operation() OR (public.sismarket_is_auth_operation() OR (user_id = public.sismarket_user_id() AND (business_id = public.sismarket_business_id() OR business_id IS NULL))));

DROP POLICY IF EXISTS saas_subscriptions_owner_or_webhook ON public.saas_subscriptions;

CREATE POLICY saas_subscriptions_owner_or_webhook ON public.saas_subscriptions FOR ALL USING (public.sismarket_is_system_operation() OR (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno'))) WITH CHECK (public.sismarket_is_system_operation() OR (public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno')));

DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated';
      END IF;
    END $$;

-- AddSupabaseAuthIdentity1793580000000

ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id uuid NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_auth_user_id ON users(auth_user_id) WHERE auth_user_id IS NOT NULL;

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.migrations (id SERIAL PRIMARY KEY, timestamp bigint NOT NULL, name varchar NOT NULL);

INSERT INTO public.migrations(timestamp, name) SELECT 1793490000000, 'CreateBaseSchema1793490000000' WHERE NOT EXISTS (SELECT 1 FROM public.migrations WHERE name = 'CreateBaseSchema1793490000000');

INSERT INTO public.migrations(timestamp, name) SELECT 1793500000000, 'CreatePurchasesAndInventoryMovements1793500000000' WHERE NOT EXISTS (SELECT 1 FROM public.migrations WHERE name = 'CreatePurchasesAndInventoryMovements1793500000000');

INSERT INTO public.migrations(timestamp, name) SELECT 1793510000000, 'IsolateBusinesses1793510000000' WHERE NOT EXISTS (SELECT 1 FROM public.migrations WHERE name = 'IsolateBusinesses1793510000000');

INSERT INTO public.migrations(timestamp, name) SELECT 1793520000000, 'AddBusinessDocumentCounters1793520000000' WHERE NOT EXISTS (SELECT 1 FROM public.migrations WHERE name = 'AddBusinessDocumentCounters1793520000000');

INSERT INTO public.migrations(timestamp, name) SELECT 1793530000000, 'CreateStockAlerts1793530000000' WHERE NOT EXISTS (SELECT 1 FROM public.migrations WHERE name = 'CreateStockAlerts1793530000000');

INSERT INTO public.migrations(timestamp, name) SELECT 1793540000000, 'CreateAuthAuditAndSessions1793540000000' WHERE NOT EXISTS (SELECT 1 FROM public.migrations WHERE name = 'CreateAuthAuditAndSessions1793540000000');

INSERT INTO public.migrations(timestamp, name) SELECT 1793550000000, 'AddCulqiPayments1793550000000' WHERE NOT EXISTS (SELECT 1 FROM public.migrations WHERE name = 'AddCulqiPayments1793550000000');

INSERT INTO public.migrations(timestamp, name) SELECT 1793560000000, 'CreateSaasSubscriptions1793560000000' WHERE NOT EXISTS (SELECT 1 FROM public.migrations WHERE name = 'CreateSaasSubscriptions1793560000000');

INSERT INTO public.migrations(timestamp, name) SELECT 1793570000000, 'EnableTenantRowSecurity1793570000000' WHERE NOT EXISTS (SELECT 1 FROM public.migrations WHERE name = 'EnableTenantRowSecurity1793570000000');

INSERT INTO public.migrations(timestamp, name) SELECT 1793580000000, 'AddSupabaseAuthIdentity1793580000000' WHERE NOT EXISTS (SELECT 1 FROM public.migrations WHERE name = 'AddSupabaseAuthIdentity1793580000000');
