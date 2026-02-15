# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-02-15

### Added

#### Markdown Memory Persistence
- **MarkdownMemoryStore** — File-based agent context persistence using markdown format
  - `saveContext()` / `loadContext()` — Atomic save with daily log files
  - `deleteContext()` / `listAgentContexts()` — Context lifecycle management
  - `compact()` — Remove log files older than retention period
  - `getStorageStats()` — Storage statistics across all agents

#### Webhook Verification
- **HmacVerifier** — HMAC-SHA256 webhook signature verification with prefix stripping and case-insensitive header lookup
- **JwtVerifier** — JWT-based webhook verification with HS256, expiration, and optional issuer validation
- **WebhookProviderPresets** — Pre-configured providers (GITHUB, STRIPE, SLACK, CUSTOM)
- **createProviderVerifier()** — Factory function for provider verifiers
- **WebhookVerificationError** — Typed error class with header name context

#### Agent Skills (ClawHavoc Scanning + Loading)
- **SkillScanner** — Security scanning with 10 built-in ClawHavoc rules and custom rule support
  - Detects pipe-to-shell, wget-pipe-to-shell, env file references, SOUL.md/memory.md tampering, eval+fetch, base64-decode-exec, rm-rf, chmod-777
- **SkillLoader** — Skill discovery and loading from configured paths
  - YAML frontmatter parsing for skill metadata
  - Signature status detection (SchemaPin .sig files)
  - Configurable scan-on-load behavior

#### Metrics Collection & Export
- **MetricsApiClient** — Sub-client for runtime metrics API (`GET /metrics/snapshot`, `GET /metrics/scheduler`, `GET /metrics/system`, `POST /metrics/export`)
- **FileMetricsExporter** — Atomic JSON file export with compact mode
- **CompositeExporter** — Fan-out to multiple export backends with partial failure tolerance
- **MetricsCollector** — Background interval-based periodic metrics export
- **MetricsExportError** — Typed error class with backend context

#### New Type Definitions (`@symbiont/types`)
- `packages/types/src/webhook.ts` — `WebhookProviderType`, `WebhookVerificationConfig`, `WebhookProviderPreset` with Zod schemas
- `packages/types/src/skills.ts` — `SignatureStatusType`, `ScanSeverityType`, `ScanFinding`, `ScanResult`, `SkillMetadata`, `LoadedSkill`, `ScanRule`, `SkillLoaderConfig`, `SkillsConfig` with Zod schemas
- `packages/types/src/metrics.ts` — `OtlpProtocol`, `OtlpConfig`, `FileMetricsConfig`, `MetricsConfig`, `SchedulerMetricsSnapshot`, `TaskManagerMetricsSnapshot`, `LoadBalancerMetricsSnapshot`, `SystemResourceMetricsSnapshot`, `MetricsSnapshot` with Zod schemas

### Changed
- Aligned with Symbiont Runtime v1.4.0
- `SymbiontClient.metricsClient` property — Lazy-loaded `MetricsApiClient` sub-client
- All new types and utilities exported from `@symbiont/core`

---

## [0.5.0] - 2026-02-11

### Added

#### AgentPin Integration
- **AgentPinClient** — Client-side credential verification, discovery, and trust bundle support via `agentpin` npm package (v0.2.0)
  - `client.agentpin.verifyCredential()` — Full 12-step online verification
  - `client.agentpin.verifyCredentialOffline()` — Offline verification with pre-fetched documents
  - `client.agentpin.verifyCredentialWithBundle()` — Trust bundle-based verification (no network)
  - `client.agentpin.fetchDiscoveryDocument()` — Fetch `.well-known/agent-identity.json`
  - `client.agentpin.issueCredential()` — Issue ES256 JWT credentials
  - `client.agentpin.generateKeyPair()` — P-256 key generation
  - Key pinning (TOFU) and JWK utilities
- **AgentPin TypeScript type definitions** in `@symbiont/types` (`AgentPinVerificationResult`, `AgentPinDiscoveryDocument`, `AgentPinTrustBundle`, `AgentPinVerifierConfig`, `AgentPinCredentialRequest`)
- **`SymbiontClient.agentpin`** — Lazy-loaded getter on `SymbiontClient` for direct access

### Changed
- Aligned with Symbiont v1.0.1 release

---

## [0.4.0] - 2026-02-07

### Added

#### Scheduling Parity & API Alignment
- **SchedulerHealthClient** — `getSchedulerHealth()` method on `ScheduleClient` covering `GET /health/scheduler` with full 13-field `SchedulerHealthResponse`
- **WorkflowClient** — New client for `POST /workflows/execute` endpoint
- **SystemClient** — New client covering `GET /health` and `GET /metrics` endpoints
- **SymbiontClient integration** — Added `schedules`, `workflows`, and `system` getters on `SymbiontClient` for direct access to all clients
- **Real health checks** — `SymbiontClient.health()` now makes actual API calls via `SystemClient` instead of returning mock data

#### Shared Types (`@symbiont/types`)
- `packages/types/src/schedule.ts` — All schedule interfaces (`CreateScheduleRequest`, `ScheduleSummary`, `ScheduleDetail`, `SchedulerHealthResponse`, etc.) with Zod schemas
- `packages/types/src/system.ts` — System types (`HealthResponse`, `WorkflowExecutionRequest`, `ErrorResponse`) with Zod schemas

#### Test Coverage
- **ScheduleClient integration tests** — 25 test cases covering all 11 methods plus error handling (empty IDs, 401, 404, 500)
- Schedule mock data added to `@symbiont/testing`

### Changed
- `ScheduleClient` now imports types from `@symbiont/types` instead of defining them inline
- Schedule types re-exported from `@symbiont/agent` for backward compatibility

---

## [0.3.1] - 2025-01-16

### Added

#### Comprehensive Test Suite
- **940 test cases** across 28 test files with 100% pass rate
- Complete test coverage for all core system components
- Authentication system tests (JWT, RBAC, security utilities)
- Configuration management tests (environment, auth, client config)
- Memory management tests (hierarchical memory, in-memory store)
- Security enhancement tests (crypto utils, input validation, secure logging)
- Vector operations tests (Qdrant integration, embeddings, search)
- HTTP endpoint management tests (metrics, middleware, lifecycle)

#### New Core Components
- **Authentication System**
  - [`AuthManager.ts`](packages/core/src/auth/AuthManager.ts) - Centralized authentication management
  - [`JWTHandler.ts`](packages/core/src/auth/JWTHandler.ts) - JWT token generation and validation
  - [`RBACManager.ts`](packages/core/src/auth/RBACManager.ts) - Role-based access control
  - [`SecurityUtils.ts`](packages/core/src/auth/SecurityUtils.ts) - Timing-safe security operations
  - [`TokenValidator.ts`](packages/core/src/auth/TokenValidator.ts) - Token validation utilities

- **Configuration Management**
  - [`AuthConfig.ts`](packages/core/src/config/AuthConfig.ts) - Authentication configuration schemas
  - [`ClientConfig.ts`](packages/core/src/config/ClientConfig.ts) - Client configuration management
  - [`DatabaseConfig.ts`](packages/core/src/config/DatabaseConfig.ts) - Database connection configuration
  - [`EnvManager.ts`](packages/core/src/config/EnvManager.ts) - Environment variable management
  - [`LoggingConfig.ts`](packages/core/src/config/LoggingConfig.ts) - Logging configuration
  - [`VectorConfig.ts`](packages/core/src/config/VectorConfig.ts) - Vector database configuration

- **Memory Management**
  - [`HierarchicalMemory.ts`](packages/core/src/memory/HierarchicalMemory.ts) - Multi-level memory storage
  - [`InMemoryStore.ts`](packages/core/src/memory/InMemoryStore.ts) - High-performance in-memory caching
  - [`MemoryManager.ts`](packages/core/src/memory/MemoryManager.ts) - Memory lifecycle management
  - [`MemoryStore.ts`](packages/core/src/memory/MemoryStore.ts) - Abstract memory store interface

- **Security Enhancements**
  - [`CryptoUtils.ts`](packages/core/src/security/CryptoUtils.ts) - Cryptographic utilities
  - [`InputValidator.ts`](packages/core/src/security/InputValidator.ts) - Input validation and sanitization
  - [`SecureLogger.ts`](packages/core/src/security/SecureLogger.ts) - Security-aware logging
  - [`SecurityConfig.ts`](packages/core/src/security/SecurityConfig.ts) - Security configuration
  - [`SecurityManager.ts`](packages/core/src/security/SecurityManager.ts) - Centralized security management

- **Vector Operations**
  - [`CollectionManager.ts`](packages/core/src/vector/qdrant/CollectionManager.ts) - Qdrant collection lifecycle
  - [`EmbeddingManager.ts`](packages/core/src/vector/qdrant/EmbeddingManager.ts) - Embedding generation and management
  - [`QdrantManager.ts`](packages/core/src/vector/qdrant/QdrantManager.ts) - Qdrant client management
  - [`SearchEngine.ts`](packages/core/src/vector/qdrant/SearchEngine.ts) - Vector search operations
  - [`VectorOperations.ts`](packages/core/src/vector/qdrant/VectorOperations.ts) - CRUD operations for vectors

- **HTTP Endpoint Management**
  - [`EndpointMetrics.ts`](packages/core/src/http/EndpointMetrics.ts) - Performance metrics collection
  - [`HttpEndpointManager.ts`](packages/core/src/http/HttpEndpointManager.ts) - HTTP endpoint lifecycle management

#### Type Definitions
- [`http.ts`](packages/types/src/http.ts) - HTTP endpoint and metrics type definitions
- [`memory.ts`](packages/types/src/memory.ts) - Memory management type definitions  
- [`vector.ts`](packages/types/src/vector.ts) - Vector operations type definitions

### Fixed

#### Critical Security Issues
- **InputValidator**: Fixed email validation to reject domains without dots and corrected SQL injection sanitization output format
- **SecurityManager**: Resolved nested sensitive data redaction in audit logs and fixed XSS validation regex state pollution through proper `lastIndex` reset
- **SecureLogger**: Fixed debug logging configuration, URL sanitization with double-encoding issues, hash regex pattern matching, empty user ID handling, and circular reference handling
- **CollectionManager**: Implemented error message nesting prevention with root error message extraction

#### Test Infrastructure Issues
- Resolved all 67 initial test failures across 12 test files
- Fixed mock configuration issues for Express and QdrantClient
- Resolved memory system circular reference issues
- Fixed configuration schema validation for OAuth, URL, and JWT schemas
- Corrected EnvManager number parsing for `tokenRefreshThreshold`
- Fixed HTTP EndpointMetrics RPM calculation issues
- Resolved HTTP EndpointManager authentication middleware integration

### Changed

#### Test Coverage Improvements
- Achieved **67.8% statement coverage** with comprehensive logic testing
- Achieved **86.98% branch coverage** with excellent conditional path testing
- Achieved **81.15% function coverage** with strong method-level testing
- Test execution time optimized to **6.69 seconds** for entire suite

#### Development Infrastructure
- Enhanced test configuration with [`test-config.js`](test-config.js)
- Added debugging utilities with [`debug-security.js`](debug-security.js)
- Updated project documentation with [`update-plan.md`](update-plan.md)

### Performance

- **Test Execution**: 940 tests complete in 6.69 seconds
- **Memory Management**: Optimized hierarchical memory with TTL and size-based eviction
- **Security Operations**: Timing-safe operations implemented across authentication components
- **Vector Operations**: Batch processing optimized for large-scale embedding operations

### Security

- **Input Validation**: Enhanced SQL injection and XSS protection
- **Authentication**: Secure JWT token lifecycle with proper refresh mechanisms
- **Audit Logging**: Comprehensive security event logging with sensitive data sanitization
- **Cryptographic Operations**: Secure key generation and management utilities
- **Access Control**: Role-based permission system with proper authorization checks

---

## Previous Versions

### [0.3.0] and earlier
See previous releases for historical changes.