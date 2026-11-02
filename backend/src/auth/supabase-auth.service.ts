import { ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SupabaseUser = { id?: string; email?: string };

@Injectable()
export class SupabaseAuthService {
  constructor(private readonly config: ConfigService) {}

  enabled() {
    return this.config.get<string>('SUPABASE_AUTH_ENABLED', 'false') === 'true';
  }

  async signIn(email: string, password: string) {
    const result = await this.request<{ user?: SupabaseUser }>(
      '/auth/v1/token?grant_type=password', 'POST',
      { email, password }, this.publishableKey(),
    );
    if (!result.user?.id) throw new UnauthorizedException('Supabase Auth no devolvió una identidad válida');
    return { id: result.user.id };
  }

  async createUser(email: string, password: string, metadata: { username: string; fullName: string }) {
    const result = await this.request<{ id?: string; user?: SupabaseUser }>(
      '/auth/v1/admin/users', 'POST',
      { email, password, email_confirm: true, user_metadata: { username: metadata.username, full_name: metadata.fullName } },
      this.secretKey(),
    );
    const id = result.user?.id ?? result.id;
    if (!id) throw new ServiceUnavailableException('Supabase Auth no devolvió el ID del usuario');
    return { id };
  }

  async deleteUser(id: string) {
    await this.request(`/auth/v1/admin/users/${encodeURIComponent(id)}`, 'DELETE', undefined, this.secretKey()).catch(() => undefined);
  }

  private baseUrl() {
    const value = this.config.get<string>('SUPABASE_URL')?.replace(/\/$/, '');
    if (!value) throw new ServiceUnavailableException('Configura SUPABASE_URL para usar Supabase Auth');
    return value;
  }

  private publishableKey() {
    const value = this.config.get<string>('SUPABASE_ANON_KEY');
    if (!value) throw new ServiceUnavailableException('Configura SUPABASE_ANON_KEY para usar Supabase Auth');
    return value;
  }

  private secretKey() {
    const value = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!value) throw new ServiceUnavailableException('Configura SUPABASE_SERVICE_ROLE_KEY solo en el backend para gestionar usuarios');
    return value;
  }

  async updateUserPassword(id: string, password: string) {
    await this.request(`/auth/v1/admin/users/${encodeURIComponent(id)}`, 'PUT', { password }, this.secretKey());
  }

  private async request<T>(path: string, method: 'POST' | 'PUT' | 'DELETE', body: Record<string, unknown> | undefined, apiKey: string): Promise<T> {
    let response: Response;
    try {
      const headers: Record<string, string> = { apikey: apiKey, 'Content-Type': 'application/json' };
      if (path.includes('/admin/')) headers.Authorization = `Bearer ${apiKey}`;
      response = await fetch(`${this.baseUrl()}${path}`, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ServiceUnavailableException('Supabase Auth no está disponible; inténtalo de nuevo.');
    }
    const result = await response.json().catch(() => ({})) as T & { msg?: string; message?: string; error_description?: string; error?: string };
    if (!response.ok) {
      const message = result.msg ?? result.message ?? result.error_description ?? result.error ?? '';
      if (method === 'POST' && path.includes('/admin/users') && [400, 409, 422].includes(response.status)) {
        throw new ConflictException(message || 'Ya existe una cuenta con ese correo en Supabase Auth');
      }
      if (path.startsWith('/auth/v1/token') && [400, 401, 422].includes(response.status)) {
        throw new UnauthorizedException('Credenciales inválidas');
      }
      throw new ServiceUnavailableException(message || 'Supabase Auth rechazó la operación');
    }
    return result;
  }
}
