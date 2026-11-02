import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSaasSubscriptions1793560000000 implements MigrationInterface {
  name = 'CreateSaasSubscriptions1793560000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS saas_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
      plan_code varchar(24) NOT NULL, amount numeric(8,2) NOT NULL, currency varchar(3) NOT NULL DEFAULT 'PEN',
      status varchar(24) NOT NULL DEFAULT 'creating', culqi_subscription_id varchar(80) NULL UNIQUE,
      culqi_customer_id varchar(80) NULL, culqi_card_id varchar(80) NULL, next_billing_at timestamp NULL,
      started_at timestamp NULL, ended_at timestamp NULL, last_event varchar(60) NULL,
      created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_business_created ON saas_subscriptions(business_id, created_at DESC)`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_saas_subscriptions_one_current ON saas_subscriptions(business_id) WHERE status IN ('creating','pending','active','past_due')`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS saas_subscriptions');
  }
}
