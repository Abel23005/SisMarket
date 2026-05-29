import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppCacheModule } from './cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { CashSession } from './cash-register/entities/cash-session.entity';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { Product } from './products/entities/product.entity';
import { ProductsModule } from './products/products.module';
import { SaleItem } from './sales/entities/sale-item.entity';
import { Sale } from './sales/entities/sale.entity';
import { SalesModule } from './sales/sales.module';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'sismarket'),
        password: config.get<string>('DB_PASSWORD', 'sismarket_secret'),
        database: config.get<string>('DB_DATABASE', 'sismarket'),
        entities: [User, Product, Sale, SaleItem, CashSession],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
    AppCacheModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    SalesModule,
    CashRegisterModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
