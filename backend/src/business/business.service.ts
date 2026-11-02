import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessProfile } from './entities/business-profile.entity';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';
import { decryptSecret, encryptSecret } from '../common/security/secret-encryption';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(BusinessProfile)
    private readonly profiles: Repository<BusinessProfile>,
    private readonly config: ConfigService,
  ) {}

  async findMine(businessId: string) {
    const profile = await this.profiles.findOneByOrFail({ id: businessId });
    const { nubefactTokenCiphertext, culqiSecretKeyCiphertext, ...safeProfile } = profile;
    return { ...safeProfile, nubefactConfigured: Boolean(nubefactTokenCiphertext), culqiConfigured: Boolean(profile.culqiPublicKey && culqiSecretKeyCiphertext) };
  }

  async update(businessId: string, dto: UpdateBusinessProfileDto) {
    const profile = await this.profiles.findOneByOrFail({ id: businessId });
    const { nubefactToken, clearNubefactToken, culqiSecretKey, clearCulqiSecretKey, ...profileFields } = dto;
    for (const [key, value] of Object.entries(profileFields)) {
      if (value !== undefined) {
        const defaults: Record<string, unknown> = {
          invoiceSeries: 'F001',
          receiptSeries: 'B001',
          nextInvoiceNumber: 1,
          nextReceiptNumber: 1,
        };
        const normalized = typeof value === 'string' ? value.trim() || defaults[key] || null : value;
        (profile as unknown as Record<string, unknown>)[key] = value === null ? defaults[key] ?? null : normalized;
      }
    }
    if (clearNubefactToken) profile.nubefactTokenCiphertext = null;
    if (nubefactToken?.trim()) {
      try {
        profile.nubefactTokenCiphertext = encryptSecret(nubefactToken.trim(), this.config);
      } catch (error) {
        throw new BadRequestException(error instanceof Error ? error.message : 'No se pudo cifrar el token Nubefact');
      }
    }
    if (clearCulqiSecretKey) profile.culqiSecretKeyCiphertext = null;
    if (culqiSecretKey?.trim()) {
      try {
        profile.culqiSecretKeyCiphertext = encryptSecret(culqiSecretKey.trim(), this.config);
      } catch (error) {
        throw new BadRequestException(error instanceof Error ? error.message : 'No se pudo cifrar la llave secreta de Culqi');
      }
    }
    const nextPublicKey = dto.culqiPublicKey === undefined ? profile.culqiPublicKey : dto.culqiPublicKey;
    const nextSecretKey = culqiSecretKey?.trim() || (clearCulqiSecretKey ? null : profile.culqiSecretKeyCiphertext ? this.configuredSecretMode(profile.culqiSecretKeyCiphertext) : null);
    if (nextPublicKey && nextSecretKey && nextPublicKey.slice(3, 7) !== String(nextSecretKey).slice(3, 7)) {
      throw new BadRequestException('Las llaves pública y secreta de Culqi deben ser ambas de prueba o ambas de producción');
    }
    const saved = await this.profiles.save(profile);
    const { nubefactTokenCiphertext, culqiSecretKeyCiphertext, ...safeProfile } = saved;
    return { ...safeProfile, nubefactConfigured: Boolean(nubefactTokenCiphertext), culqiConfigured: Boolean(saved.culqiPublicKey && culqiSecretKeyCiphertext) };
  }

  private configuredSecretMode(ciphertext: string) {
    try { return decryptSecret(ciphertext, this.config).slice(3, 7); }
    catch { return ''; }
  }
}
