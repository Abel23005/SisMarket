import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContextData {
  userId?: string;
  businessId?: string;
  role?: string;
  jti?: string;
  authOperation?: boolean;
  systemOperation?: boolean;
}

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContextData>();

  run<T>(context: TenantContextData, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  current(): TenantContextData | undefined {
    return this.storage.getStore();
  }

  toDatabaseClaims(context: TenantContextData) {
    return {
      sub: context.userId ?? null,
      business_id: context.businessId ?? null,
      app_role: context.role ?? null,
      jti: context.jti ?? null,
      auth_operation: context.authOperation === true,
      system_operation: context.systemOperation === true,
    };
  }
}
