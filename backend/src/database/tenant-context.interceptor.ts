import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      user?: { id?: string; businessId?: string; role?: string; jti?: string };
      method?: string;
      originalUrl?: string;
      url?: string;
    }>();
    const path = (request.originalUrl ?? request.url ?? '').split('?')[0].replace(/\/$/, '');
    const method = (request.method ?? '').toUpperCase();
    const publicAuthRoutes = new Set([
      'POST /api/auth/login',
      'POST /api/auth/accept-invitation',
      'POST /api/auth/setup-owner',
      'POST /api/auth/register-business',
      'GET /api/auth/setup-status',
    ]);
    const user = request.user;
    const tenant = {
      userId: user?.id,
      businessId: user?.businessId,
      role: user?.role,
      jti: user?.jti,
      authOperation: !user && publicAuthRoutes.has(`${method} ${path}`),
    };

    return new Observable((subscriber) => this.tenantContext.run(tenant, () => next.handle().subscribe(subscriber)));
  }
}
