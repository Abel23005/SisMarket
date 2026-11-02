import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { timingSafeEqual } from 'node:crypto';
import { DataSource, In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { BusinessProfile } from '../business/entities/business-profile.entity';
import { ForbiddenException } from '@nestjs/common';
import { SaasSubscription } from './entities/saas-subscription.entity';
import { SubscribeDto } from './dto/subscribe.dto';
import { TenantContextService } from '../database/tenant-context.service';

const PLANS = [
  { code: 'basico', name: 'Básico', amount: 49, features: ['Inventario', 'Ventas', 'Caja'] },
  { code: 'estandar', name: 'Estándar', amount: 89, features: ['Todo lo del Básico', 'Proveedores', 'Reportes'] },
  { code: 'premium', name: 'Premium', amount: 149, features: ['Todo lo del Estándar', 'Pagos digitales', 'Facturación electrónica', 'Asistente IA'] },
] as const;

type CulqiObject = { id?: string; status?: number | string; next_billing_date?: number; user_message?: string; metadata?: Record<string, string> };

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SaasSubscription) private readonly subscriptions: Repository<SaasSubscription>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly tenantContext: TenantContextService,
  ) {}

  catalog() {
    const configured = this.configured();
    return { enabled: configured, publicKey: this.config.get<string>('CULQI_BILLING_PUBLIC_KEY') ?? null, plans: PLANS.map((plan) => ({ ...plan, currency: 'PEN', interval: 'mensual' })) };
  }

  async current(businessId: string) {
    return this.subscriptions.findOne({ where: { businessId, status: In(['creating', 'pending', 'active', 'past_due']) }, order: { createdAt: 'DESC' } });
  }

  async entitlements(businessId: string) {
    const enforced = this.config.get<string>('SUBSCRIPTION_ENFORCEMENT', 'false') === 'true';
    const subscription = await this.subscriptions.findOne({ where: { businessId, status: 'active' }, order: { createdAt: 'DESC' } });
    const level = subscription ? PLANS.findIndex((plan) => plan.code === subscription.planCode) + 1 : 0;
    return {
      enforced,
      planCode: subscription?.planCode ?? null,
      basic: !enforced || level >= 1,
      standard: !enforced || level >= 2,
      premium: !enforced || level >= 3,
    };
  }

  async assertPlan(businessId: string, required: 'basico' | 'estandar' | 'premium') {
    if (this.config.get<string>('SUBSCRIPTION_ENFORCEMENT', 'false') !== 'true') return;
    const subscription = await this.subscriptions.findOne({ where: { businessId, status: 'active' }, order: { createdAt: 'DESC' } });
    const levels: Record<string, number> = { basico: 1, estandar: 2, premium: 3 };
    if (!subscription || (levels[subscription.planCode] ?? 0) < levels[required]) throw new ForbiddenException(`Esta función requiere el plan ${required}. Revisa Suscripción en la configuración del negocio.`);
  }

  async subscribe(businessId: string, userId: string, dto: SubscribeDto) {
    if (dto.tyc !== true) throw new BadRequestException('Debes aceptar los términos de cobro recurrente antes de suscribirte');
    const secret = this.configured();
    if (!secret) throw new ServiceUnavailableException('Configura las llaves y los IDs de planes de Culqi en el backend antes de activar las suscripciones');
    const plan = PLANS.find((item) => item.code === dto.planCode)!;
    const externalPlanId = this.config.get<string>(`CULQI_PLAN_${plan.code.toUpperCase()}`)!;
    const user = await this.users.findOne({ where: { id: userId, businessId, active: true } });
    if (!user) throw new BadRequestException('No se pudo verificar al dueño de este minimarket');

    const reservation = await this.dataSource.transaction(async (manager) => {
      const profile = await manager.findOne(BusinessProfile, { where: { id: businessId }, lock: { mode: 'pessimistic_write' } });
      if (!profile) throw new BadRequestException('No se encontró el negocio');
      const active = await manager.findOne(SaasSubscription, { where: { businessId, status: In(['creating', 'pending', 'active', 'past_due']) }, lock: { mode: 'pessimistic_write' } });
      if (active) throw new ConflictException('Este negocio ya tiene una suscripción en proceso o activa. Cancélala antes de cambiar de plan.');
      return manager.save(manager.create(SaasSubscription, { businessId, planCode: plan.code, amount: plan.amount.toFixed(2), status: 'creating', currency: 'PEN', culqiSubscriptionId: null, culqiCustomerId: null, culqiCardId: null, nextBillingAt: null, startedAt: null, endedAt: null, lastEvent: null }));
    });

    let subscriptionId: string | null = null;
    let subscriptionRequestStarted = false;
    try {
      const fullName = user.fullName.trim().split(/\s+/);
      const firstName = fullName.shift() || user.username;
      const lastName = fullName.join(' ') || 'SisMarket';
      const customer = await this.api<CulqiObject>('/customers', 'POST', { first_name: firstName, last_name: lastName, email: user.email, country_code: 'PE' });
      if (!customer.id) throw new ServiceUnavailableException('Culqi no devolvió el ID del cliente');
      reservation.culqiCustomerId = customer.id;
      await this.subscriptions.save(reservation);

      const card = await this.api<CulqiObject>('/cards', 'POST', { customer_id: customer.id, token_id: dto.culqiToken });
      if (!card.id) throw new ServiceUnavailableException('Culqi no devolvió el ID de la tarjeta tokenizada');
      reservation.culqiCardId = card.id;
      await this.subscriptions.save(reservation);

      subscriptionRequestStarted = true;
      const created = await this.api<CulqiObject>('/recurrent/subscriptions/create', 'POST', {
        card_id: card.id,
        plan_id: externalPlanId,
        tyc: dto.tyc,
        metadata: { business_id: businessId, subscription_id: reservation.id, plan_code: plan.code },
      });
      if (!created.id) throw new ServiceUnavailableException('Culqi no devolvió el ID de la suscripción');
      subscriptionId = created.id;
      reservation.culqiSubscriptionId = created.id;
      this.applyProviderStatus(reservation, created, 'subscription.creation.succeeded');
      await this.subscriptions.save(reservation);
      return reservation;
    } catch (error) {
      if (subscriptionId) {
        reservation.status = 'pending';
        reservation.culqiSubscriptionId = subscriptionId;
        reservation.lastEvent = 'subscription.creation.response_pending';
        await this.subscriptions.save(reservation).catch(() => undefined);
      } else if (subscriptionRequestStarted && !(error instanceof BadRequestException)) {
        reservation.status = 'pending';
        reservation.lastEvent = 'subscription.creation.unknown';
        await this.subscriptions.save(reservation).catch(() => undefined);
      } else {
        reservation.status = 'failed';
        reservation.lastEvent = 'subscription.creation.failed';
        await this.subscriptions.save(reservation).catch(() => undefined);
      }
      throw error;
    }
  }

  async cancel(businessId: string) {
    const subscription = await this.current(businessId);
    if (!subscription || !subscription.culqiSubscriptionId || !['active', 'pending', 'past_due'].includes(subscription.status)) {
      throw new BadRequestException('No hay una suscripción activa que se pueda cancelar');
    }
    await this.api(`/recurrent/subscriptions/${encodeURIComponent(subscription.culqiSubscriptionId)}`, 'DELETE');
    subscription.status = 'canceled';
    subscription.endedAt = new Date();
    subscription.lastEvent = 'subscription.cancel.succeeded';
    return this.subscriptions.save(subscription);
  }

  async refresh(businessId: string) {
    const subscription = await this.current(businessId);
    if (!subscription?.culqiSubscriptionId) return subscription;
    const provider = await this.api<CulqiObject>(`/recurrent/subscriptions/${encodeURIComponent(subscription.culqiSubscriptionId)}`, 'GET');
    this.applyProviderStatus(subscription, provider, 'subscription.refresh');
    return this.subscriptions.save(subscription);
  }

  async processWebhook(secret: string, body: Record<string, unknown>) {
    const expected = this.config.get<string>('CULQI_WEBHOOK_SECRET') ?? '';
    if (expected.length < 32 || !this.safeEqual(secret, expected)) throw new BadRequestException('Webhook no autorizado');
    const eventType = String(body.type ?? body.event_type ?? '');
    const data = body.data as { object?: Record<string, unknown> } | undefined;
    const object = (data?.object ?? body.object ?? {}) as Record<string, unknown>;
    const objectId = String(object.id ?? '');
    const externalId = String(object.subscription_id ?? (objectId.startsWith('sxn_') ? objectId : ''));
    const metadata = object.metadata as Record<string, string> | undefined;
    const localId = metadata?.subscription_id;
    if (!externalId.startsWith('sxn_') && !localId) return { received: true, processed: false };
    return this.tenantContext.run({ systemOperation: true }, async () => {
      let subscription = externalId.startsWith('sxn_')
        ? await this.subscriptions.findOne({ where: { culqiSubscriptionId: externalId } })
        : null;
      if (!subscription && localId) subscription = await this.subscriptions.findOne({ where: { id: localId, status: In(['creating', 'pending']) } });
      if (!subscription) return { received: true, processed: false };
      const remoteId = externalId;
      if (!remoteId.startsWith('sxn_')) return { received: true, processed: false };
      const provider = await this.api<CulqiObject>(`/recurrent/subscriptions/${encodeURIComponent(remoteId)}`, 'GET');
      if (provider.metadata?.subscription_id && provider.metadata.subscription_id !== subscription.id) throw new BadRequestException('El evento de Culqi no corresponde a esta suscripción local');
      subscription.culqiSubscriptionId = remoteId;
      this.applyProviderStatus(subscription, provider, eventType);
      await this.subscriptions.save(subscription);
      return { received: true, processed: true };
    });
  }

  private applyProviderStatus(subscription: SaasSubscription, provider: CulqiObject, event: string) {
    const status = provider.status;
    if (status === 4 || status === 'canceled' || status === 6) subscription.status = 'canceled';
    else if (event === 'subscription.charge.failed') subscription.status = 'past_due';
    else if (status === 3 || status === 'active') subscription.status = 'active';
    else subscription.status = 'pending';
    if (subscription.status === 'active' && !subscription.startedAt) subscription.startedAt = new Date();
    if (subscription.status === 'canceled' && !subscription.endedAt) subscription.endedAt = new Date();
    subscription.nextBillingAt = provider.next_billing_date ? new Date(provider.next_billing_date * 1000) : subscription.nextBillingAt;
    subscription.lastEvent = event.slice(0, 60);
  }

  private configured() {
    const publicKey = this.config.get<string>('CULQI_BILLING_PUBLIC_KEY') ?? '';
    const secret = this.config.get<string>('CULQI_BILLING_SECRET_KEY') ?? '';
    const mode = publicKey.startsWith('pk_test_') ? 'test' : publicKey.startsWith('pk_live_') ? 'live' : '';
    if (!mode || !secret.startsWith(`sk_${mode}_`)) return false;
    return PLANS.every((plan) => (this.config.get<string>(`CULQI_PLAN_${plan.code.toUpperCase()}`) ?? '').startsWith(`pln_${mode}_`));
  }

  private async api<T extends CulqiObject = CulqiObject>(path: string, method: 'GET' | 'POST' | 'DELETE', body?: Record<string, unknown>): Promise<T> {
    const secret = this.config.get<string>('CULQI_BILLING_SECRET_KEY') ?? '';
    let response: Response;
    try {
      response = await fetch(`https://api.culqi.com/v2${path}`, { method, headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
    } catch {
      throw new ServiceUnavailableException('No se pudo confirmar la respuesta de Culqi. Actualiza el estado desde Suscripción antes de intentar otra acción.');
    }
    const result = await response.json().catch(() => ({})) as T & { user_message?: string };
    if (!response.ok) throw new BadRequestException(result.user_message ?? 'Culqi rechazó la operación de suscripción');
    return result;
  }

  private safeEqual(received: string, expected: string) {
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
