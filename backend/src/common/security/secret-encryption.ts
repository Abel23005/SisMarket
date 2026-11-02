import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';

function getEncryptionKey(config: ConfigService): Buffer {
  const value = config.get<string>('APP_ENCRYPTION_KEY') ?? '';
  if (!/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error('APP_ENCRYPTION_KEY debe contener exactamente 64 caracteres hexadecimales');
  }
  return Buffer.from(value, 'hex');
}

export function encryptSecret(value: string, config: ConfigService): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(config), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
}

export function decryptSecret(value: string, config: ConfigService): string {
  const [version, iv, tag, ciphertext] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !ciphertext) throw new Error('Formato de secreto cifrado inválido');
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(config), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
