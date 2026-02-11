/**
 * AgentPin sub-client for client-side credential verification, discovery,
 * and trust bundle operations.
 *
 * Wraps the `agentpin` npm package directly — AgentPin is a client-side
 * verification layer, not a Symbiont Runtime HTTP endpoint.
 */

import type {
  AgentPinVerificationResult,
  AgentPinDiscoveryDocument,
  AgentPinTrustBundle,
  AgentPinVerifierConfig,
  AgentPinCredentialRequest,
} from '@symbiont/types';

// Re-export types for convenience
export type {
  AgentPinVerificationResult,
  AgentPinDiscoveryDocument,
  AgentPinTrustBundle,
  AgentPinVerifierConfig,
  AgentPinCredentialRequest,
};

// Lazy-loaded agentpin module reference
let _agentpin: any;

function getAgentPin(): any {
  if (!_agentpin) {
    try {
      _agentpin = require('agentpin');
    } catch {
      throw new Error(
        'The "agentpin" package is required for AgentPinClient. ' +
        'Install it with: npm install agentpin'
      );
    }
  }
  return _agentpin;
}

/**
 * Client for AgentPin credential verification, discovery, and trust bundle operations.
 *
 * Unlike other Symbiont sub-clients, AgentPinClient does NOT make HTTP calls to
 * the Symbiont Runtime. AgentPin is a client-side cryptographic verification layer
 * that wraps the `agentpin` npm package directly.
 *
 * @example
 * ```typescript
 * const client = new SymbiontClient(config);
 *
 * // Generate keys
 * const { privateKeyPem, publicKeyPem } = client.agentpin.generateKeyPair();
 *
 * // Issue a credential
 * const jwt = client.agentpin.issueCredential({
 *   privateKeyPem, kid: client.agentpin.generateKeyId(publicKeyPem),
 *   issuer: 'example.com', agentId: 'agent-1',
 *   capabilities: ['read:data', 'write:data'],
 * });
 *
 * // Verify online (fetches discovery document)
 * const result = await client.agentpin.verifyCredential(jwt);
 * ```
 */
export class AgentPinClient {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private client: any;

  constructor(client: any) {
    this.client = client;
  }

  // ===========================================================================
  // Key Management
  // ===========================================================================

  /** Generate an ECDSA P-256 key pair. */
  generateKeyPair(): { privateKeyPem: string; publicKeyPem: string } {
    const ap = getAgentPin();
    return ap.generateKeyPair();
  }

  /** Derive a key ID (SHA-256 hex) from a PEM-encoded public key. */
  generateKeyId(publicKeyPem: string): string {
    const ap = getAgentPin();
    return ap.generateKeyId(publicKeyPem);
  }

  // ===========================================================================
  // Credential Issuance
  // ===========================================================================

  /**
   * Issue an ES256 JWT credential.
   * @returns Compact JWT string
   */
  issueCredential(request: AgentPinCredentialRequest): string {
    const ap = getAgentPin();
    return ap.issueCredential(
      request.privateKeyPem,
      request.kid,
      request.issuer,
      request.agentId,
      request.audience || null,
      request.capabilities.map((c: string) => new ap.Capability(c)),
      request.constraints || null,
      request.delegationChain || null,
      request.ttlSecs ?? 3600,
    );
  }

  // ===========================================================================
  // Verification
  // ===========================================================================

  /**
   * Full 12-step online verification. Fetches the discovery document and
   * optional revocation document from the issuer domain automatically.
   */
  async verifyCredential(
    jwt: string,
    audience?: string,
    config?: AgentPinVerifierConfig,
  ): Promise<AgentPinVerificationResult> {
    const ap = getAgentPin();
    const pinStore = new ap.KeyPinStore();
    const verifierConfig = config
      ? { clock_skew_secs: config.clockSkewSecs, max_ttl_secs: config.maxTtlSecs }
      : undefined;
    return ap.verifyCredential(jwt, pinStore, audience || null, verifierConfig || null);
  }

  /**
   * Offline verification with pre-fetched discovery and optional revocation documents.
   */
  verifyCredentialOffline(
    jwt: string,
    discovery: AgentPinDiscoveryDocument | Record<string, unknown>,
    revocation?: Record<string, unknown>,
    pinStore?: any,
    audience?: string,
    config?: AgentPinVerifierConfig,
  ): AgentPinVerificationResult {
    const ap = getAgentPin();
    const store = pinStore || new ap.KeyPinStore();
    const verifierConfig = config
      ? { clock_skew_secs: config.clockSkewSecs, max_ttl_secs: config.maxTtlSecs }
      : undefined;
    return ap.verifyCredentialOffline(
      jwt,
      discovery,
      revocation || null,
      store,
      audience || null,
      verifierConfig || null,
    );
  }

  /**
   * Trust bundle-based verification (no network required).
   */
  verifyCredentialWithBundle(
    jwt: string,
    bundle: AgentPinTrustBundle | Record<string, unknown>,
    pinStore?: any,
    audience?: string,
    config?: AgentPinVerifierConfig,
  ): AgentPinVerificationResult {
    const ap = getAgentPin();
    const store = pinStore || new ap.KeyPinStore();
    const verifierConfig = config
      ? { clock_skew_secs: config.clockSkewSecs, max_ttl_secs: config.maxTtlSecs }
      : undefined;
    return ap.verifyCredentialWithBundle(
      jwt,
      bundle,
      store,
      audience || null,
      verifierConfig || null,
    );
  }

  // ===========================================================================
  // Discovery
  // ===========================================================================

  /** Fetch a domain's `.well-known/agent-identity.json` discovery document. */
  async fetchDiscoveryDocument(
    domain: string,
  ): Promise<AgentPinDiscoveryDocument> {
    const ap = getAgentPin();
    return ap.fetchDiscoveryDocument(domain);
  }

  /** Build a discovery document locally. */
  buildDiscoveryDocument(
    entity: string,
    entityType: string,
    publicKeys: Record<string, unknown>[],
    agents: Record<string, unknown>[],
    maxDelegationDepth: number,
  ): Record<string, unknown> {
    const ap = getAgentPin();
    return ap.buildDiscoveryDocument(
      entity,
      entityType,
      publicKeys,
      agents,
      maxDelegationDepth,
    );
  }

  /**
   * Validate a discovery document structure and entity match.
   * @throws AgentPinError on validation failure
   */
  validateDiscoveryDocument(
    doc: AgentPinDiscoveryDocument | Record<string, unknown>,
    expectedEntity: string,
  ): void {
    const ap = getAgentPin();
    ap.validateDiscoveryDocument(doc, expectedEntity);
  }

  // ===========================================================================
  // Trust Bundles
  // ===========================================================================

  /** Create an empty trust bundle. */
  createTrustBundle(): AgentPinTrustBundle {
    const ap = getAgentPin();
    return ap.createTrustBundle();
  }

  // ===========================================================================
  // Key Pinning
  // ===========================================================================

  /** Create a new TOFU key pin store. */
  createPinStore(): any {
    const ap = getAgentPin();
    return new ap.KeyPinStore();
  }

  // ===========================================================================
  // JWK Utilities
  // ===========================================================================

  /** Convert a PEM-encoded public key to JWK format. */
  pemToJwk(publicKeyPem: string, kid: string): Record<string, unknown> {
    const ap = getAgentPin();
    return ap.pemToJwk(publicKeyPem, kid);
  }

  /** Convert a JWK to PEM-encoded public key. */
  jwkToPem(jwk: Record<string, unknown>): string {
    const ap = getAgentPin();
    return ap.jwkToPem(jwk);
  }
}
