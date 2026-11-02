import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BusinessProfile } from '../business/entities/business-profile.entity';
import { decryptSecret } from '../common/security/secret-encryption';
import { Sale } from '../sales/entities/sale.entity';

export interface NubefactResponse {
  errors?: string;
  enlace?: string;
  enlace_del_pdf?: string;
  enlace_del_xml?: string;
  enlace_del_cdr?: string;
  sunat_description?: string;
  sunat_note?: string;
  sunat_responsecode?: string;
}

export interface NubefactEmission {
  status: 'not_configured' | 'rejected' | 'accepted' | 'error';
  response?: NubefactResponse;
}

@Injectable()
export class NubefactService {
  private readonly logger = new Logger(NubefactService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(BusinessProfile) private readonly profiles: Repository<BusinessProfile>,
  ) {}

  async isEnabled(businessId: string) {
    try {
      const credentials = await this.getCredentials(businessId);
      return Boolean(credentials.apiUrl && credentials.token);
    } catch {
      return false;
    }
  }

  shouldAutoSend() {
    return this.config.get<string>('NUBEFACT_AUTO_SEND', 'false') === 'true';
  }

  async emitDocument(sale: Sale, businessId: string): Promise<NubefactEmission> {
    let credentials: { apiUrl?: string; token?: string };
    try {
      credentials = await this.getCredentials(businessId);
    } catch {
      this.logger.error('No se pudieron descifrar las credenciales de Nubefact');
      return { status: 'error', response: { errors: 'No se pudo leer la configuración de Nubefact' } };
    }
    const { apiUrl, token } = credentials;
    if (!apiUrl || !token) {
      return { status: 'not_configured' as const, response: { errors: 'Configura las credenciales de Nubefact para este minimarket' } };
    }

    sale = await this.allocateDocumentNumber(sale, businessId);

    const authorization = token.startsWith('Token ')
      ? token
      : `Token token="${token}"`;

    let response: Response;
    let data: NubefactResponse;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.buildDocumentPayload(sale)),
      });
      data = (await response.json()) as NubefactResponse;
    } catch (error) {
      this.logger.error(
        `No se pudo conectar con Nubefact para ${sale.ticketNumber}`,
        error instanceof Error ? error.stack : undefined,
      );
      return {
        status: 'error' as const,
        response: { errors: 'No se pudo conectar con el proveedor' },
      };
    }

    if (!response.ok || data.errors) {
      this.logger.warn(`Nubefact rechazo ${sale.ticketNumber}: ${data.errors}`);
      return {
        status: 'rejected' as const,
        response: data,
      };
    }

    return {
      status: 'accepted' as const,
      response: data,
    };
  }

  private buildDocumentPayload(sale: Sale) {
    const isInvoice = sale.documentType === 'factura';
    const serie = sale.nubefactSeries ?? (isInvoice
      ? this.config.get<string>('NUBEFACT_SERIE_FACTURA', 'F001')
      : this.config.get<string>('NUBEFACT_SERIE_BOLETA', 'B001'));
    const numero = sale.nubefactNumber;
    const enviarSunat = this.config.get<string>('NUBEFACT_SEND_TO_SUNAT', 'false') === 'true';

    return {
      operacion: 'generar_comprobante',
      tipo_de_comprobante: isInvoice ? 1 : 2,
      serie,
      numero,
      sunat_transaction: 1,
      cliente_tipo_de_documento: sale.customerDocumentType ?? 1,
      cliente_numero_de_documento: sale.customerDocumentNumber ?? '00000000',
      cliente_denominacion: sale.customerName || 'CONSUMIDOR FINAL',
      cliente_direccion: sale.customerAddress ?? '',
      cliente_email: sale.customerEmail ?? '',
      fecha_de_emision: this.formatDateForNubefact(sale.createdAt),
      moneda: 1,
      porcentaje_de_igv: 18,
      total_gravada: Number(sale.subtotal).toFixed(2),
      total_igv: Number(sale.tax).toFixed(2),
      total: Number(sale.total).toFixed(2),
      enviar_automaticamente_a_la_sunat: enviarSunat,
      enviar_automaticamente_al_cliente: false,
      items: (sale.items ?? []).map((item) => {
        const lineTotal = Number(item.subtotal);
        const lineSubtotal = Number((lineTotal / 1.18).toFixed(2));
        const igv = Number((lineTotal - lineSubtotal).toFixed(2));
        const unitPrice = Number(item.unitPrice);
        const unitValue = Number((unitPrice / 1.18).toFixed(6));
        return {
          unidad_de_medida: 'NIU',
          codigo: item.product?.sku ?? item.productId,
          descripcion: item.product?.name ?? 'Producto',
          cantidad: item.quantity,
          valor_unitario: unitValue,
          precio_unitario: unitPrice,
          descuento: '',
          subtotal: lineSubtotal.toFixed(2),
          tipo_de_igv: 1,
          igv: igv.toFixed(2),
          total: lineTotal.toFixed(2),
          anticipo_regularizacion: false,
        };
      }),
    };
  }

  private formatDateForNubefact(date: Date) {
    const parts = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(date);
    const value = (type: string) => parts.find((part) => part.type === type)?.value;
    return `${value('day')}-${value('month')}-${value('year')}`;
  }

  private async allocateDocumentNumber(sale: Sale, businessId: string): Promise<Sale> {
    return this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(Sale, {
        where: { id: sale.id, businessId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) return sale;
      if (locked.nubefactStatus === 'processing' && locked.nubefactProcessingAt && Date.now() - locked.nubefactProcessingAt.getTime() < 120_000) {
        throw new BadRequestException('La emisión de este comprobante ya está en proceso; espera un momento');
      }
      if (locked.nubefactNumber !== null && locked.nubefactNumber !== undefined) {
        sale.nubefactNumber = locked.nubefactNumber;
        sale.nubefactSeries = locked.nubefactSeries;
      } else {
        const profile = await manager.findOne(BusinessProfile, {
          where: { id: businessId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!profile) throw new BadRequestException('Configura los datos del minimarket antes de emitir comprobantes');
        if (locked.documentType === 'factura') {
          locked.nubefactNumber = profile.nextInvoiceNumber;
          locked.nubefactSeries = profile.invoiceSeries;
          profile.nextInvoiceNumber += 1;
        } else {
          locked.nubefactNumber = profile.nextReceiptNumber;
          locked.nubefactSeries = profile.receiptSeries;
          profile.nextReceiptNumber += 1;
        }
        await manager.save(profile);
        sale.nubefactNumber = locked.nubefactNumber;
        sale.nubefactSeries = locked.nubefactSeries;
      }
      locked.nubefactStatus = 'processing';
      locked.nubefactProcessingAt = new Date();
      await manager.save(locked);
      sale.nubefactStatus = locked.nubefactStatus;
      sale.nubefactProcessingAt = locked.nubefactProcessingAt;
      return sale;
    });
  }

  private async getCredentials(businessId: string) {
    const profile = await this.profiles.findOne({ where: { id: businessId } });
    const businessCount = await this.profiles.count();
    const perBusinessToken = profile?.nubefactTokenCiphertext
      ? decryptSecret(profile.nubefactTokenCiphertext, this.config)
      : undefined;
    const allowDeploymentFallback = businessCount <= 1;
    return {
      apiUrl: this.config.get<string>('NUBEFACT_API_URL'),
      token: perBusinessToken || (allowDeploymentFallback ? this.config.get<string>('NUBEFACT_TOKEN') : undefined),
    };
  }
}
