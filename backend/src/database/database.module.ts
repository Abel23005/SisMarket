import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { SeedService } from './seed.service';
import { BusinessProfile } from '../business/entities/business-profile.entity';
import { TenantContextService } from './tenant-context.service';
import { TenantContextInterceptor } from './tenant-context.interceptor';
import { RlsQueryRunnerService } from './rls-query-runner.service';
import { SupabaseAuthService } from '../auth/supabase-auth.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, Product, Supplier, BusinessProfile])],
  providers: [
    TenantContextService,
    RlsQueryRunnerService,
    SupabaseAuthService,
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
    SeedService,
  ],
  exports: [TenantContextService, SupabaseAuthService],
})
export class DatabaseModule {}
