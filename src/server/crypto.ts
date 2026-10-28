import 'server-only';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

let cachedSecret: string | undefined;

/**
 * APP_SECRET protects sessions, OAuth state and stored integration tokens.
 * Production refuses to start without one. In development a random secret is
 * written to the data directory once so a fresh clone runs without setup.
 */
function appSecret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.APP_SECRET;
  if (fromEnv) {
    if (fromEnv.length < 32) throw new Error('APP_SECRET must be at least 32 characters');
    return (cachedSecret = fromEnv);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('APP_SECRET is required in production');
  }
  const dir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  const file = path.join(dir, '.dev-secret');
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  return (cachedSecret = fs.readFileSync(file, 'utf8').trim());
}

function deriveKey(purpose: string): Buffer {
  return Buffer.from(crypto.hkdfSync('sha256', appSecret(), Buffer.alloc(0), purpose, 32));
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey('integration-credentials'), iv);
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString('base64url')).join('.');
}

export function decrypt(payload: string): string {
  const [iv, tag, body] = payload.split('.').map((p) => Buffer.from(p, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey('integration-credentials'), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}

/** Short-lived signed value, used for the OAuth `state` parameter. */
export function signValue(value: string, ttlSeconds: number): string {
  const body = `${value}.${Math.floor(Date.now() / 1000) + ttlSeconds}`;
  const mac = crypto.createHmac('sha256', deriveKey('signed-values')).update(body).digest('base64url');
  return `${body}.${mac}`;
}

export function verifySignedValue(signed: string): string | null {
  const lastDot = signed.lastIndexOf('.');
  if (lastDot < 0) return null;
  const body = signed.slice(0, lastDot);
  const expected = crypto.createHmac('sha256', deriveKey('signed-values')).update(body).digest();
  const given = Buffer.from(signed.slice(lastDot + 1), 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  const expDot = body.lastIndexOf('.');
  if (Number(body.slice(expDot + 1)) < Date.now() / 1000) return null;
  return body.slice(0, expDot);
}
