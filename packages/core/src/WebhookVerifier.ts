import * as crypto from 'crypto';

/**
 * Error thrown when webhook signature verification fails.
 */
export class WebhookVerificationError extends Error {
  public headerName: string;

  constructor(message: string, headerName: string) {
    super(message);
    this.name = 'WebhookVerificationError';
    this.headerName = headerName;
  }
}

/**
 * Abstract base class for webhook signature verifiers.
 */
export interface SignatureVerifier {
  verify(headers: Record<string, string>, body: Buffer): void;
}

/**
 * HMAC-SHA256 webhook signature verifier.
 */
export class HmacVerifier implements SignatureVerifier {
  private secret: Buffer;
  private headerName: string;
  private prefix: string | null;

  constructor(secret: Buffer, headerName: string, prefix: string | null = null) {
    this.secret = secret;
    this.headerName = headerName.toLowerCase();
    this.prefix = prefix;
  }

  private findHeader(headers: Record<string, string>): string {
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === this.headerName) {
        return value;
      }
    }
    throw new WebhookVerificationError(
      `Missing signature header: ${this.headerName}`,
      this.headerName
    );
  }

  verify(headers: Record<string, string>, body: Buffer): void {
    let sigValue = this.findHeader(headers);

    // Strip prefix if configured
    if (this.prefix && sigValue.startsWith(this.prefix)) {
      sigValue = sigValue.slice(this.prefix.length);
    }

    // Compute expected HMAC
    const expected = crypto
      .createHmac('sha256', this.secret)
      .update(body)
      .digest('hex');

    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(sigValue);

    if (
      expectedBuf.length !== receivedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      throw new WebhookVerificationError(
        'HMAC signature mismatch',
        this.headerName
      );
    }
  }
}

/**
 * JWT-based webhook signature verifier.
 *
 * Uses Node.js native crypto for HS256 JWT verification.
 */
export class JwtVerifier implements SignatureVerifier {
  private secret: Buffer;
  private headerName: string;
  private requiredIssuer: string | null;

  constructor(secret: Buffer, headerName: string, requiredIssuer: string | null = null) {
    this.secret = secret;
    this.headerName = headerName.toLowerCase();
    this.requiredIssuer = requiredIssuer;
  }

  private findHeader(headers: Record<string, string>): string {
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === this.headerName) {
        return value;
      }
    }
    throw new WebhookVerificationError(
      `Missing JWT header: ${this.headerName}`,
      this.headerName
    );
  }

  verify(headers: Record<string, string>, _body: Buffer): void {
    let token = this.findHeader(headers);

    // Strip Bearer prefix
    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }

    // Decode and verify JWT manually (HS256 only)
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new WebhookVerificationError('Invalid JWT format', this.headerName);
    }

    // Verify signature
    const signInput = `${parts[0]}.${parts[1]}`;
    const expectedSig = crypto
      .createHmac('sha256', this.secret)
      .update(signInput)
      .digest('base64url');

    if (expectedSig !== parts[2]) {
      throw new WebhookVerificationError('JWT signature mismatch', this.headerName);
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new WebhookVerificationError('JWT token has expired', this.headerName);
    }

    // Check issuer
    if (this.requiredIssuer && payload.iss !== this.requiredIssuer) {
      throw new WebhookVerificationError('JWT issuer mismatch', this.headerName);
    }
  }
}

/**
 * Pre-configured webhook provider presets.
 */
export const WebhookProviderPresets = {
  GITHUB: { headerName: 'X-Hub-Signature-256', prefix: 'sha256=' },
  STRIPE: { headerName: 'Stripe-Signature', prefix: null },
  SLACK: { headerName: 'X-Slack-Signature', prefix: 'v0=' },
  CUSTOM: { headerName: 'X-Signature', prefix: null },
} as const;

export type WebhookProviderName = keyof typeof WebhookProviderPresets;

/**
 * Factory function to create a verifier for a known provider.
 */
export function createProviderVerifier(
  provider: WebhookProviderName,
  secret: Buffer
): HmacVerifier {
  const preset = WebhookProviderPresets[provider];
  return new HmacVerifier(secret, preset.headerName, preset.prefix);
}
