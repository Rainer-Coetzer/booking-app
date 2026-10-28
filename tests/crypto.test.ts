import { describe, expect, it } from 'vitest';
import { decrypt, encrypt, signValue, verifySignedValue } from '@/server/crypto';

describe('crypto', () => {
  it('round-trips encrypted values and uses a fresh IV each time', () => {
    const a = encrypt('{"refresh_token":"abc"}');
    const b = encrypt('{"refresh_token":"abc"}');
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe('{"refresh_token":"abc"}');
  });

  it('rejects tampered ciphertext', () => {
    const [iv, tag, body] = encrypt('secret').split('.');
    const flipped = body.slice(0, -1) + (body.endsWith('A') ? 'B' : 'A');
    expect(() => decrypt([iv, tag, flipped].join('.'))).toThrow();
  });

  it('verifies signed values and rejects edits', () => {
    const signed = signValue('7:nonce', 60);
    expect(verifySignedValue(signed)).toBe('7:nonce');
    expect(verifySignedValue(signed.replace('7:', '8:'))).toBeNull();
    expect(verifySignedValue('garbage')).toBeNull();
  });

  it('rejects expired signed values', () => {
    expect(verifySignedValue(signValue('x', -1))).toBeNull();
  });
});
