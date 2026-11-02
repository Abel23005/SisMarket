import { MigrationInterface, QueryRunner } from 'typeorm';

const TENANT_TABLES = [
  'users', 'business_profiles', 'products', 'sales', 'sale_items', 'cash_sessions',
  'suppliers', 'inventory_movements', 'purchase_orders', 'purchase_order_items',
  'team_invitations', 'stock_alerts', 'auth_sessions', 'auth_audit_logs',
  'saas_subscriptions',
];

export class EnableTenantRowSecurity1793570000000 implements MigrationInterface {
  name = 'EnableTenantRowSecurity1793570000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.sismarket_context() RETURNS jsonb
      LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public
      AS $$ SELECT COALESCE(NULLIF(current_setting('app.sismarket_context', true), '')::jsonb, '{}'::jsonb) $$
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.sismarket_business_id() RETURNS uuid
      LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public
      AS $$ SELECT NULLIF(public.sismarket_context() ->> 'business_id', '')::uuid $$
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.sismarket_user_id() RETURNS uuid
      LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public
      AS $$ SELECT NULLIF(public.sismarket_context() ->> 'sub', '')::uuid $$
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.sismarket_role() RETURNS text
      LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public
      AS $$ SELECT public.sismarket_context() ->> 'app_role' $$
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.sismarket_is_auth_operation() RETURNS boolean
      LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public
      AS $$ SELECT COALESCE((public.sismarket_context() ->> 'auth_operation')::boolean, false) $$
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.sismarket_is_system_operation() RETURNS boolean
      LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public
      AS $$ SELECT COALESCE((public.sismarket_context() ->> 'system_operation')::boolean, false) $$
    `);
    await queryRunner.query(`GRANT EXECUTE ON FUNCTION public.sismarket_context(), public.sismarket_business_id(), public.sismarket_user_id(), public.sismarket_role(), public.sismarket_is_auth_operation(), public.sismarket_is_system_operation() TO PUBLIC`);

    for (const table of TENANT_TABLES) {
      await queryRunner.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE public.${table} FORCE ROW LEVEL SECURITY`);
    }

    await this.policy(queryRunner, 'users', 'users_read_self_or_business', 'SELECT', `public.sismarket_is_auth_operation() OR id = public.sismarket_user_id() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno')`);
    await this.policy(queryRunner, 'users', 'users_insert_owner_or_auth', 'INSERT', null, `public.sismarket_is_auth_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno')`);
    await this.policy(queryRunner, 'users', 'users_update_owner_or_auth', 'UPDATE', `public.sismarket_is_auth_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno')`, `public.sismarket_is_auth_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno')`);

    await this.policy(queryRunner, 'business_profiles', 'business_profiles_read_tenant', 'SELECT', `id = public.sismarket_business_id() OR public.sismarket_is_auth_operation()`);
    await this.policy(queryRunner, 'business_profiles', 'business_profiles_insert_auth', 'INSERT', null, `public.sismarket_is_auth_operation()`);
    await this.policy(queryRunner, 'business_profiles', 'business_profiles_update_owner_or_cashier', 'UPDATE', `id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'cajero')`, `id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'cajero')`);

    await this.policy(queryRunner, 'products', 'products_read_tenant', 'SELECT', `business_id = public.sismarket_business_id()`);
    await this.policy(queryRunner, 'products', 'products_write_managers', 'INSERT', null, `business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero')`);
    await this.policy(queryRunner, 'products', 'products_update_managers', 'UPDATE', `business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero')`, `business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero')`);

    await this.policy(queryRunner, 'sales', 'sales_read_owner_or_cashier', 'SELECT', `business_id = public.sismarket_business_id() AND (public.sismarket_role() = 'dueno' OR cashier_id = public.sismarket_user_id())`);
    await this.policy(queryRunner, 'sales', 'sales_insert_owner_or_cashier', 'INSERT', null, `business_id = public.sismarket_business_id() AND cashier_id = public.sismarket_user_id() AND public.sismarket_role() IN ('dueno', 'cajero')`);
    await this.policy(queryRunner, 'sales', 'sales_update_owner_or_cashier', 'UPDATE', `business_id = public.sismarket_business_id() AND (public.sismarket_role() = 'dueno' OR (public.sismarket_role() = 'cajero' AND cashier_id = public.sismarket_user_id()))`, `business_id = public.sismarket_business_id() AND (public.sismarket_role() = 'dueno' OR (public.sismarket_role() = 'cajero' AND cashier_id = public.sismarket_user_id()))`);

    await this.policy(queryRunner, 'sale_items', 'sale_items_read_parent_sale', 'SELECT', `EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id)`);
    await this.policy(queryRunner, 'sale_items', 'sale_items_insert_parent_sale', 'INSERT', null, `EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.business_id = public.sismarket_business_id() AND (public.sismarket_role() = 'dueno' OR (public.sismarket_role() = 'cajero' AND s.cashier_id = public.sismarket_user_id())))`);

    await this.policy(queryRunner, 'cash_sessions', 'cash_sessions_read_owner_or_cashier', 'SELECT', `business_id = public.sismarket_business_id() AND (public.sismarket_role() = 'dueno' OR cashier_id = public.sismarket_user_id())`);
    await this.policy(queryRunner, 'cash_sessions', 'cash_sessions_insert_owner_or_cashier', 'INSERT', null, `business_id = public.sismarket_business_id() AND cashier_id = public.sismarket_user_id() AND public.sismarket_role() IN ('dueno', 'cajero')`);
    await this.policy(queryRunner, 'cash_sessions', 'cash_sessions_update_owner_or_cashier', 'UPDATE', `business_id = public.sismarket_business_id() AND (public.sismarket_role() = 'dueno' OR (public.sismarket_role() = 'cajero' AND cashier_id = public.sismarket_user_id()))`, `business_id = public.sismarket_business_id() AND (public.sismarket_role() = 'dueno' OR (public.sismarket_role() = 'cajero' AND cashier_id = public.sismarket_user_id()))`);

    await this.policy(queryRunner, 'suppliers', 'suppliers_tenant_managers', 'ALL', `business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero')`, `business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero')`);
    await this.policy(queryRunner, 'inventory_movements', 'inventory_movements_read_managers', 'SELECT', `business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero')`);
    await this.policy(queryRunner, 'inventory_movements', 'inventory_movements_insert_operations', 'INSERT', null, `business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'cajero', 'almacenero')`);

    await this.policy(queryRunner, 'purchase_orders', 'purchase_orders_tenant_managers', 'ALL', `business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero')`, `business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero')`);
    await this.policy(queryRunner, 'purchase_order_items', 'purchase_order_items_read_parent', 'SELECT', `EXISTS (SELECT 1 FROM public.purchase_orders p WHERE p.id = purchase_order_id)`);
    await this.policy(queryRunner, 'purchase_order_items', 'purchase_order_items_write_parent', 'INSERT', null, `EXISTS (SELECT 1 FROM public.purchase_orders p WHERE p.id = purchase_order_id AND p.business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero'))`);
    await this.policy(queryRunner, 'purchase_order_items', 'purchase_order_items_update_parent', 'UPDATE', `EXISTS (SELECT 1 FROM public.purchase_orders p WHERE p.id = purchase_order_id AND p.business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero'))`, `EXISTS (SELECT 1 FROM public.purchase_orders p WHERE p.id = purchase_order_id AND p.business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'almacenero'))`);

    await this.policy(queryRunner, 'team_invitations', 'team_invitations_select_owner_or_auth', 'SELECT', `public.sismarket_is_auth_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno')`);
    await this.policy(queryRunner, 'team_invitations', 'team_invitations_insert_owner', 'INSERT', null, `business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno'`);
    await this.policy(queryRunner, 'team_invitations', 'team_invitations_update_owner_or_auth', 'UPDATE', `public.sismarket_is_auth_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno')`, `public.sismarket_is_auth_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno')`);

    await this.policy(queryRunner, 'stock_alerts', 'stock_alerts_tenant_operations', 'SELECT', `business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'cajero', 'almacenero')`);
    await this.policy(queryRunner, 'stock_alerts', 'stock_alerts_insert_operations', 'INSERT', null, `business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'cajero', 'almacenero')`);
    await this.policy(queryRunner, 'stock_alerts', 'stock_alerts_update_operations', 'UPDATE', `business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'cajero', 'almacenero')`, `business_id = public.sismarket_business_id() AND public.sismarket_role() IN ('dueno', 'cajero', 'almacenero')`);

    await this.policy(queryRunner, 'auth_sessions', 'auth_sessions_read_self', 'SELECT', `public.sismarket_is_auth_operation() OR user_id = public.sismarket_user_id()`);
    await this.policy(queryRunner, 'auth_sessions', 'auth_sessions_insert_self', 'INSERT', null, `public.sismarket_is_auth_operation() OR (user_id = public.sismarket_user_id() AND business_id = public.sismarket_business_id())`);
    await this.policy(queryRunner, 'auth_sessions', 'auth_sessions_update_self', 'UPDATE', `user_id = public.sismarket_user_id() AND business_id = public.sismarket_business_id()`, `user_id = public.sismarket_user_id() AND business_id = public.sismarket_business_id()`);
    await this.policy(queryRunner, 'auth_audit_logs', 'auth_audit_logs_read_owner', 'SELECT', `business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno'`);
    await this.policy(queryRunner, 'auth_audit_logs', 'auth_audit_logs_insert_request', 'INSERT', null, `public.sismarket_is_auth_operation() OR (user_id = public.sismarket_user_id() AND (business_id = public.sismarket_business_id() OR business_id IS NULL))`);

    await this.policy(queryRunner, 'saas_subscriptions', 'saas_subscriptions_owner_or_webhook', 'ALL', `public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno')`, `public.sismarket_is_system_operation() OR (business_id = public.sismarket_business_id() AND public.sismarket_role() = 'dueno')`);

    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated';
      END IF;
    END $$`);
  }

  private async policy(queryRunner: QueryRunner, table: string, name: string, command: string, using?: string | null, check?: string | null) {
    await queryRunner.query(`DROP POLICY IF EXISTS ${name} ON public.${table}`);
    const usingClause = using ? ` USING (public.sismarket_is_system_operation() OR (${using}))` : '';
    const checkClause = check ? ` WITH CHECK (public.sismarket_is_system_operation() OR (${check}))` : '';
    await queryRunner.query(`CREATE POLICY ${name} ON public.${table} FOR ${command}${usingClause}${checkClause}`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA public TO anon';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated';
      END IF;
    END $$`);
    await queryRunner.query(`DO $$ DECLARE policy_row record; BEGIN
      FOR policy_row IN
        SELECT c.relname AS table_name, p.polname AS policy_name
        FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND p.polname LIKE 'sismarket_%'
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_row.policy_name, policy_row.table_name);
      END LOOP;
    END $$`);
    for (const table of TENANT_TABLES) {
      await queryRunner.query(`ALTER TABLE public.${table} NO FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY`);
    }
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.sismarket_is_system_operation()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.sismarket_is_auth_operation()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.sismarket_role()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.sismarket_user_id()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.sismarket_business_id()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.sismarket_context()`);
  }
}
