import { Module } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssistantModule } from './assistant/assistant.module';
import { AlertsModule } from './alerts/alerts.module';
import { PaymentsModule } from './payments/payments.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SaasSubscription } from './subscriptions/entities/saas-subscription.entity';
import { StockAlert } from './alerts/entities/stock-alert.entity';
import { AppCacheModule } from './cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { AuthSession } from './auth/entities/auth-session.entity';
import { AuthAuditLog } from './auth/entities/auth-audit-log.entity';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { CashSession } from './cash-register/entities/cash-session.entity';
import { DatabaseModule } from './database/database.module';
import { BusinessModule } from './business/business.module';
import { BusinessProfile } from './business/entities/business-profile.entity';
import { TeamInvitation } from './invitations/entities/team-invitation.entity';
import { HealthController } from './health/health.controller';
import { Product } from './products/entities/product.entity';
import { InventoryMovement } from './inventory/entities/inventory-movement.entity';
import { ProductsModule } from './products/products.module';
import { SaleItem } from './sales/entities/sale-item.entity';
import { Sale } from './sales/entities/sale.entity';
import { SalesModule } from './sales/sales.module';
import { PurchaseOrder } from './purchases/entities/purchase-order.entity';
import { PurchaseOrderItem } from './purchases/entities/purchase-order-item.entity';
import { PurchasesModule } from './purchases/purchases.module';
import { Supplier } from './suppliers/entities/supplier.entity';
import { SuppliersModule } from './suppliers/suppliers.module';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const sslEnabled = config.get<string>('DB_SSL', 'false') === 'true';
        const sslCaCertificate = config.get<string>('DB_SSL_CA_CERT');
        return {
          type: 'postgres' as const,
          url: config.get<string>('DATABASE_URL') || undefined,
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'sismarket'),
          password: config.get<string>('DB_PASSWORD', 'sismarket_secret'),
          database: config.get<string>('DB_DATABASE', 'sismarket'),
          // Use the provider CA when supplied; do not combine this object with sslmode in DATABASE_URL.
          ...(sslEnabled
            ? {
                ssl: {
                  rejectUnauthorized: true,
                  ...(sslCaCertificate ? { ca: readFileSync(resolve(sslCaCertificate), 'utf8') } : {}),
                },
              }
            : {}),
          entities: [
            User,
            Product,
            Sale,
            SaleItem,
            CashSession,
            Supplier,
            InventoryMovement,
            PurchaseOrder,
            PurchaseOrderItem,
            BusinessProfile,
            TeamInvitation,
            StockAlert,
            AuthSession,
            AuthAuditLog,
            SaasSubscription,
          ],
          migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
          migrationsRun: config.get<string>('DB_MIGRATIONS_RUN', config.get<string>('NODE_ENV') === 'production' ? 'false' : 'true') === 'true',
          synchronize: false,
          logging: config.get<string>('NODE_ENV') === 'development',
        };
      },
    }),
    AppCacheModule,
    AssistantModule,
    AlertsModule,
    PaymentsModule,
    SubscriptionsModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    SalesModule,
    CashRegisterModule,
    SuppliersModule,
    PurchasesModule,
    BusinessModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
