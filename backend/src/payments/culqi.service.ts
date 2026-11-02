import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { decryptSecret } from '../common/security/secret-encryption';
import { BusinessProfile } from '../business/entities/business-profile.entity';

type CulqiCharge = { id?: string; amount?: number; currency_code?: string; currency?: string; state?: string; response_code?: string; user_message?: string; merchant_message?: string; source?: { last_four?: string } };

@Injectable()
export class CulqiService {
  constructor(
    @InjectRepository(BusinessProfile) private readonly profiles: Repository<BusinessProfile>,
    private readonly config: ConfigService,
  ) {}

  async publicConfig(businessId: string) {
    const profile = await this.profiles.findOneByOrFail({ id: businessId });
    return { enabled: Boolean(profile.culqiPublicKey && profile.culqiSecretKeyCiphertext), publicKey: profile.culqiPublicKey };
  }

  async createCharge(businessId: string, token: string, amount: number, email: string, description: string) {
    const profile = await this.getConfiguredProfile(businessId);
    const amountInCents = Math.round(amount * 100);
    if (!Number.isSafeInteger(amountInCents) || amountInCents < 1) throw new BadRequestException('El importe de la venta no es válido');
    const charge = await this.callApi<CulqiCharge>(profile, '/charges', 'POST', {
      amount: amountInCents,
      currency_code: 'PEN',
      email,
      source_id: token,
      description: description.slice(0, 250),
    });
    if (charge.state !== 'Exitosa' || !charge.id) throw new BadRequestException(charge.user_message || 'Culqi no confirmó el pago');
    return charge;
  }

  async verifyCharge(businessId: string, chargeId: string, expectedAmount: number) {
    const profile = await this.getConfiguredProfile(businessId);
    const charge = await this.callApi<CulqiCharge>(profile, `/charges/${encodeURIComponent(chargeId)}`, 'GET');
    if (charge.state !== 'Exitosa' || charge.currency !== 'PEN' || charge.amount !== Math.round(expectedAmount * 100)) {
      throw new BadRequestException('El cargo no coincide con esta venta o no figura como exitoso en Culqi');
    }
    return charge;
  }

  private async getConfiguredProfile(businessId: string) {
    const profile = await this.profiles.findOneByOrFail({ id: businessId });
    if (!profile.culqiPublicKey || !profile.culqiSecretKeyCiphertext) {
      throw new BadRequestException('El dueño debe configurar las llaves de Culqi antes de cobrar con tarjeta');
    }
    try {
      return { ...profile, secretKey: decryptSecret(profile.culqiSecretKeyCiphertext, this.config) };
    } catch {
      throw new ServiceUnavailableException('No se pudo descifrar la llave de Culqi; verifica APP_ENCRYPTION_KEY');
    }
  }

  private async callApi<T extends CulqiCharge>(profile: BusinessProfile & { secretKey: string }, path: string, method: 'GET' | 'POST', body?: Record<string, unknown>): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`https://api.culqi.com/v2${path}`, {
        method,
        headers: { Authorization: `Bearer ${profile.secretKey}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(this.config.get<number>('CULQI_TIMEOUT_MS', 15000)),
      });
    } catch {
      throw new ServiceUnavailableException('No se pudo confirmar la respuesta de Culqi. La venta quedó pendiente para conciliación; revisa el panel de Culqi antes de reintentar.');
    }
    const result = await response.json().catch(() => ({})) as T & { user_message?: string };
    if (!response.ok) {
      throw new BadRequestException(result.user_message || 'Culqi rechazó el pago');
    }
    return result;
  }
}
