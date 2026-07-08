import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Sale } from '../sales/entities/sale.entity';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

@Injectable()
export class AssistantService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
  ) {}

  async chat(message: string) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('Gemini no está configurado');
    }

    const model = this.config.get<string>('GEMINI_MODEL', 'gemini-2.0-flash');
    const snapshot = await this.buildBusinessSnapshot();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: [
                  'Eres el asistente de SisMarket, un sistema para minimarkets en Perú.',
                  'Responde en español, con tono claro y práctico.',
                  'Usa solo los datos operativos entregados en el contexto.',
                  'Si faltan datos, dilo y sugiere una acción concreta.',
                  'No inventes ventas, productos, precios ni stock.',
                ].join(' '),
              },
            ],
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Contexto operativo:\n${snapshot}\n\nPregunta del dueño:\n${message}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
          },
        }),
      },
    );

    const data = (await response.json()) as GeminiResponse;
    if (!response.ok) {
      throw new ServiceUnavailableException(
        data.error?.message ?? 'No se pudo consultar Gemini',
      );
    }

    const answer = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();

    if (!answer) {
      throw new ServiceUnavailableException('Gemini no devolvió respuesta');
    }

    return { answer };
  }

  private async buildBusinessSnapshot() {
    const [products, sales] = await Promise.all([
      this.productsRepository.find({
        where: { active: true },
        order: { name: 'ASC' },
        take: 80,
      }),
      this.salesRepository.find({
        relations: { items: { product: true } },
        order: { createdAt: 'DESC' },
        take: 80,
      }),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const todaySales = sales.filter(
      (sale) => sale.createdAt.toISOString().slice(0, 10) === today,
    );
    const todayTotal = todaySales.reduce(
      (sum, sale) => sum + Number(sale.total),
      0,
    );
    const lowStock = products.filter(
      (product) => product.stock <= product.minStock,
    );

    return [
      `Fecha: ${today}`,
      `Productos activos: ${products.length}`,
      `Ventas registradas recientes: ${sales.length}`,
      `Ventas de hoy: ${todaySales.length}`,
      `Total vendido hoy: S/ ${todayTotal.toFixed(2)}`,
      `Productos con stock bajo: ${lowStock.length}`,
      `Stock bajo detalle: ${
        lowStock
          .slice(0, 12)
          .map(
            (product) =>
              `${product.name} (${product.stock}/${product.minStock} uds)`,
          )
          .join(', ') || 'Ninguno'
      }`,
      `Productos: ${products
        .slice(0, 25)
        .map(
          (product) =>
            `${product.name} | SKU ${product.sku} | S/ ${Number(product.price).toFixed(2)} | stock ${product.stock}`,
        )
        .join('; ')}`,
    ].join('\n');
  }
}
