import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';
import {
  HmacVerifier,
  JwtVerifier,
  WebhookVerificationError,
  createProviderVerifier,
} from '../WebhookVerifier';

const SECRET = Buffer.from('test-secret-key-that-is-32-bytes!');
const BODY = Buffer.from('{"event": "push"}');

function hmacSig(secret: Buffer, body: Buffer): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function createJwt(
  payload: Record<string, unknown>,
  secret: Buffer
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

describe('HmacVerifier', () => {
  it('should verify a valid HMAC signature', () => {
    const sig = hmacSig(SECRET, BODY);
    const verifier = new HmacVerifier(SECRET, 'X-Signature');
    expect(() => verifier.verify({ 'X-Signature': sig }, BODY)).not.toThrow();
  });

  it('should handle prefix stripping', () => {
    const sig = hmacSig(SECRET, BODY);
    const verifier = new HmacVerifier(SECRET, 'X-Hub-Signature-256', 'sha256=');
    expect(() =>
      verifier.verify({ 'X-Hub-Signature-256': `sha256=${sig}` }, BODY)
    ).not.toThrow();
  });

  it('should reject invalid signature', () => {
    const verifier = new HmacVerifier(SECRET, 'X-Signature');
    expect(() =>
      verifier.verify({ 'X-Signature': 'bad' }, BODY)
    ).toThrow(WebhookVerificationError);
  });

  it('should throw on missing header', () => {
    const verifier = new HmacVerifier(SECRET, 'X-Signature');
    expect(() => verifier.verify({}, BODY)).toThrow('Missing signature header');
  });

  it('should do case-insensitive header lookup', () => {
    const sig = hmacSig(SECRET, BODY);
    const verifier = new HmacVerifier(SECRET, 'X-Signature');
    expect(() => verifier.verify({ 'x-signature': sig }, BODY)).not.toThrow();
  });
});

describe('JwtVerifier', () => {
  it('should verify a valid JWT', () => {
    const token = createJwt(
      { sub: 'test', exp: Math.floor(Date.now() / 1000) + 3600 },
      SECRET
    );
    const verifier = new JwtVerifier(SECRET, 'Authorization');
    expect(() =>
      verifier.verify({ Authorization: `Bearer ${token}` }, BODY)
    ).not.toThrow();
  });

  it('should reject an expired JWT', () => {
    const token = createJwt(
      { sub: 'test', exp: Math.floor(Date.now() / 1000) - 3600 },
      SECRET
    );
    const verifier = new JwtVerifier(SECRET, 'Authorization');
    expect(() =>
      verifier.verify({ Authorization: `Bearer ${token}` }, BODY)
    ).toThrow('expired');
  });
});

describe('createProviderVerifier', () => {
  it('should create a GitHub provider verifier', () => {
    const sig = hmacSig(SECRET, BODY);
    const verifier = createProviderVerifier('GITHUB', SECRET);
    expect(() =>
      verifier.verify({ 'X-Hub-Signature-256': `sha256=${sig}` }, BODY)
    ).not.toThrow();
  });
});
