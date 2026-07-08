import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sale } from '../sales/entities/sale.entity';

interface NubefactResponse {
  errors?: string;
  enlace?: string;
  enlace_del_pdf?: string;
  enlace_del_xml?: string;
  enlace_del_cdr?: string;
  sunat_description?: string;
  sunat_note?: string;
  sunat_responsecode?: string;
}

@Injectable()
export class NubefactService {
  private readonly logger = new Logger(NubefactService.name);

  constructor(private readonly config: ConfigService) {}

  isEnabled() {
    return Boolean(
      this.config.get<string>('NUBEFACT_API_URL') &&
        this.config.get<string>('NUBEFACT_TOKEN'),
    );
  }

  shouldAutoSend() {
    return this.config.get<string>('NUBEFACT_AUTO_SEND', 'false') === 'true';
  }

  async emitBoleta(sale: Sale) {
    const apiUrl = this.config.get<string>('NUBEFACT_API_URL');
    const token = this.config.get<string>('NUBEFACT_TOKEN');
    if (!apiUrl || !token) {
      return { status: 'not_configured' as const };
    }

    const authorization = token.startsWith('Token ')
      ? token
      : `Token token="${token}"`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.buildBoletaPayload(sale)),
    });
    const data = (await response.json()) as NubefactResponse;

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

  private buildBoletaPayload(sale: Sale) {
    const serie = this.config.get<string>('NUBEFACT_SERIE_BOLETA', 'B001');
    const numero = Number(sale.ticketNumber.replace(/\D/g, '').slice(-8));
    const enviarSunat = this.config.get<string>('NUBEFACT_SEND_TO_SUNAT', 'false') === 'true';

    return {
      operacion: 'generar_comprobante',
      tipo_de_comprobante: 2,
      serie,
      numero,
      sunat_transaction: 1,
      cliente_tipo_de_documento: 1,
      cliente_numero_de_documento: '00000000',
      cliente_denominacion: 'CONSUMIDOR FINAL',
      cliente_direccion: '',
      cliente_email: '',
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
}
