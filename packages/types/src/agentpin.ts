/**
 * AgentPin type definitions for credential verification, discovery, and trust bundles.
 */

/** Result of verifying an AgentPin credential */
export interface AgentPinVerificationResult {
  valid: boolean;
  agent_id?: string;
  issuer?: string;
  capabilities?: string[];
  constraints?: Record<string, unknown>;
  delegation_verified?: boolean;
  delegation_chain?: unknown[];
  key_pinning?: string;
  error_code?: string;
  error_message?: string;
  warnings?: string[];
}

/** AgentPin discovery document from .well-known/agent-identity.json */
export interface AgentPinDiscoveryDocument {
  agentpin_version: string;
  entity: string;
  entity_type: string;
  public_keys: AgentPinPublicKey[];
  agents: AgentPinAgentDeclaration[];
  max_delegation_depth: number;
  updated_at: string;
  revocation_endpoint?: string;
  policy_url?: string;
}

/** Public key entry in a discovery document */
export interface AgentPinPublicKey {
  kid: string;
  kty: string;
  crv: string;
  x: string;
  y: string;
  use?: string;
  key_ops?: string[];
  exp?: number;
}

/** Agent declaration in a discovery document */
export interface AgentPinAgentDeclaration {
  agent_id: string;
  name: string;
  capabilities: string[];
  status: string;
  agent_type?: string;
  description?: string;
  version?: string;
  constraints?: Record<string, unknown>;
  maker_attestation?: unknown;
  credential_ttl_max?: number;
  directory_listing?: boolean;
}

/** Trust bundle containing pre-fetched discovery and revocation documents */
export interface AgentPinTrustBundle {
  agentpin_bundle_version: string;
  created_at: string;
  documents: Record<string, unknown>[];
  revocations: Record<string, unknown>[];
}

/** Configuration for the AgentPin verifier */
export interface AgentPinVerifierConfig {
  clockSkewSecs?: number;
  maxTtlSecs?: number;
}

/** Request to issue an AgentPin credential */
export interface AgentPinCredentialRequest {
  privateKeyPem: string;
  kid: string;
  issuer: string;
  agentId: string;
  audience?: string;
  capabilities: string[];
  constraints?: Record<string, unknown>;
  delegationChain?: unknown[];
  ttlSecs?: number;
}
