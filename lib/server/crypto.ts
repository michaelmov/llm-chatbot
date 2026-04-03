import crypto from 'node:crypto';
import { config } from './config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function deriveKey(): Buffer {
  const secret = config.auth.secret;
  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET is required for encryption');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export function encrypt(plaintext: string): { ciphertext: string; iv: string; authTag: string } {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
  };
}

export function decrypt(ciphertext: string, ivHex: string, authTagHex: string): string {
  const key = deriveKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
