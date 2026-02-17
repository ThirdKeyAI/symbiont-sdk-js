# Symbiont SDK Implementation Guide

This document provides practical guidance for implementing the Symbiont JavaScript SDK based on the architectural design.

## Development Phases

### Phase 1: Foundation (Weeks 1-3)
- Set up monorepo with Lerna/Nx
- Create `@symbi/types` package with core interfaces
- Implement basic `@symbi/core` package
- Set up build pipeline and CI/CD

### Phase 2: Core Functionality (Weeks 4-6)
- Complete `SymbiontClient` with dual API support
- Implement authentication management
- Add validation layer with configurable modes
- Create `@symbi/agent` package

### Phase 3: Specialized Clients (Weeks 7-9)
- Implement `@symbi/tool-review` package
- Create `@symbi/policy` package
- Add comprehensive error handling
- Implement caching and middleware

### Phase 4: Advanced Features (Weeks 10-12)
- Complete `@symbi/secrets` package
- Implement `@symbi/mcp` package
- Add browser and worker support
- Create `@symbi/cli` package

### Phase 5: Testing & Documentation (Weeks 13-14)
- Complete test coverage
- Finalize documentation
- Performance optimization
- Release preparation

## Technical Implementation Details

### 1. Monorepo Setup

```bash
# Initialize workspace
npm init -w packages/core
npm init -w packages/types
npm init -w packages/agent
# ... other packages

# Install shared dependencies
npm install -D typescript @types/node lerna rollup jest
npm install axios ws zod
```

**Workspace Structure:**
```json
{
  "name": "symbiont-sdk-js",
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build": "lerna run build",
    "test": "lerna run test",
    "publish": "lerna publish"
  }
}
```

### 2. TypeScript Configuration

**Root tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "baseUrl": ".",
    "paths": {
      "@symbi/*": ["packages/*/src"]
    }
  },
  "references": [
    { "path": "./packages/types" },
    { "path": "./packages/core" },
    { "path": "./packages/agent" }
  ]
}
```

### 3. Package Structure Template

Each package should follow this structure:
```
packages/[package-name]/
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── client.ts
│   └── utils/
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
├── rollup.config.js
└── README.md
```

### 4. Core Implementation Patterns

#### Validation Layer Implementation

```typescript
// packages/core/src/validation.ts
export class ValidationLayer {
  private schemas = new Map<string, z.ZodSchema>();
  private mode: ValidationMode;

  constructor(mode: ValidationMode = 'development') {
    this.mode = mode;
    this.registerSchemas();
  }

  private registerSchemas(): void {
    this.schemas.set('agentDefinition', AgentDefinitionSchema);
    this.schemas.set('executionResult', ExecutionResultSchema);
    // Register all schemas
  }

  async validate<T>(data: unknown, schemaKey: string): Promise<T> {
    if (this.mode === 'performance') {
      return data as T;
    }

    const schema = this.schemas.get(schemaKey);
    if (!schema) {
      if (this.mode === 'strict') {
        throw new ValidationError(`Schema not found: ${schemaKey}`);
      }
      return data as T;
    }

    try {
      return await schema.parseAsync(data) as T;
    } catch (error) {
      if (this.mode === 'strict') {
        throw new ValidationError(`Validation failed for ${schemaKey}`, error);
      }
      console.warn(`Validation warning for ${schemaKey}:`, error);
      return data as T;
    }
  }
}
```

#### Authentication Manager Implementation

```typescript
// packages/core/src/auth.ts
export class AuthenticationManager {
  private runtimeToken: string | null = null;
  private jwtToken: string | null = null;
  private tokenRefreshPromise: Promise<void> | null = null;

  constructor(private config: SymbiontConfig) {}

  async getAuthHeaders(endpoint: string): Promise<Record<string, string>> {
    const isToolReview = this.isToolReviewEndpoint(endpoint);
    
    if (isToolReview) {
      const token = await this.getValidJwtToken();
      return { 'Authorization': `Bearer ${token}` };
    } else {
      const token = await this.getValidRuntimeToken();
      return { 'Authorization': `Bearer ${token}` };
    }
  }

  private async getValidRuntimeToken(): Promise<string> {
    if (!this.runtimeToken || this.isTokenExpired(this.runtimeToken)) {
      if (!this.tokenRefreshPromise) {
        this.tokenRefreshPromise = this.refreshRuntimeToken();
      }
      await this.tokenRefreshPromise;
      this.tokenRefreshPromise = null;
    }
    return this.runtimeToken!;
  }

  private isToolReviewEndpoint(endpoint: string): boolean {
    return endpoint.includes('/sessions') || 
           endpoint.includes('/tool-review') ||
           endpoint.includes('/tools/submit');
  }
}
```

### 5. HTTP Client with Middleware

```typescript
// packages/core/src/http.ts
export class HttpClient {
  private middlewareStack: MiddlewareStack;

  constructor(
    private config: SymbiontConfig,
    private authManager: AuthenticationManager
  ) {
    this.middlewareStack = new MiddlewareStack();
    this.setupMiddlewares();
  }

  private setupMiddlewares(): void {
    this.middlewareStack.use(new AuthenticationMiddleware(this.authManager));
    this.middlewareStack.use(new ValidationMiddleware(this.validationLayer));
    this.middlewareStack.use(new CacheMiddleware(this.cacheManager));
    this.middlewareStack.use(new RetryMiddleware(this.config.retryConfig));
    this.middlewareStack.use(new ErrorHandlingMiddleware());
  }

  async request<T>(endpoint: string, options: RequestOptions): Promise<T> {
    const context = this.createRequestContext(endpoint, options);
    const result = await this.middlewareStack.execute(context);
    return result.response as T;
  }
}
```

### 6. Build Configuration

#### Rollup Configuration Template

```javascript
// packages/core/rollup.config.js
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
  // Node.js build
  {
    input: 'src/index.ts',
    output: [
      { file: 'dist/index.js', format: 'cjs', sourcemap: true },
      { file: 'dist/index.esm.js', format: 'esm', sourcemap: true }
    ],
    external: ['axios', 'ws', 'zod'],
    plugins: [
      resolve({ preferBuiltins: true }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' })
    ]
  },
  // Browser build
  {
    input: 'src/browser.ts',
    output: {
      file: 'dist/browser.esm.js',
      format: 'esm',
      sourcemap: true
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.browser.json' })
    ]
  }
];
```

### 7. Testing Strategy

#### Unit Test Template

```typescript
// packages/core/tests/unit/client.test.ts
import { SymbiontClient } from '../src/client';
import { MockAuthManager } from '../src/test-utils';

describe('SymbiontClient', () => {
  let client: SymbiontClient;
  let mockAuth: MockAuthManager;

  beforeEach(() => {
    mockAuth = new MockAuthManager();
    client = new SymbiontClient({
      apiUrl: 'http://localhost:8080',
      apiKey: 'test-key',
      validationMode: 'development'
    });
  });

  it('should initialize with correct configuration', () => {
    expect(client.config.apiUrl).toBe('http://localhost:8080');
    expect(client.config.validationMode).toBe('development');
  });

  it('should connect successfully', async () => {
    mockAuth.setHealthy(true);
    await expect(client.connect()).resolves.toBeUndefined();
  });
});
```

#### Integration Test Template

```typescript
// packages/core/tests/integration/api.test.ts
import { SymbiontClient } from '../src';
import { TestEnvironment } from '@symbi/testing';

describe('API Integration', () => {
  let env: TestEnvironment;
  let client: SymbiontClient;

  beforeAll(async () => {
    env = new TestEnvironment();
    await env.setup();
    client = env.getClient();
  });

  afterAll(async () => {
    await env.teardown();
  });

  it('should perform health check', async () => {
    const health = await client.health();
    expect(health.status).toBe('healthy');
  });
});
```

### 8. Documentation Generation

#### JSDoc Configuration

```javascript
// jsdoc.conf.js
module.exports = {
  source: {
    include: ['./packages/*/src'],
    includePattern: '\\.(js|ts)$',
    exclude: ['node_modules/', 'dist/']
  },
  opts: {
    destination: './docs/api/',
    recurse: true
  },
  plugins: ['plugins/markdown', 'jsdoc-plugin-typescript'],
  templates: {
    cleverLinks: false,
    monospaceLinks: false
  }
};
```

### 9. CI/CD Pipeline

#### GitHub Actions Template

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18, 20]
    
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm run lint
      - run: npm run type-check

  publish:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          registry-url: 'https://registry.npmjs.org'
      
      - run: npm ci
      - run: npm run build
      - run: npm run publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 10. Performance Optimization Guidelines

#### Bundle Size Optimization

1. **Tree Shaking**: Ensure all exports are properly marked
2. **Code Splitting**: Separate browser and Node.js builds
3. **Dynamic Imports**: Use lazy loading for specialized clients
4. **Dependency Management**: Keep core dependencies minimal

#### Runtime Performance

1. **Connection Pooling**: Reuse HTTP connections
2. **Request Batching**: Combine multiple API calls
3. **Intelligent Caching**: Cache responses with appropriate TTL
4. **Memory Management**: Clean up subscriptions and timeouts

### 11. Security Considerations

#### Token Management

```typescript
export class SecureTokenStorage {
  private tokens = new Map<string, TokenData>();

  store(key: string, token: string, expiresAt: Date): void {
    this.tokens.set(key, {
      value: this.encrypt(token),
      expiresAt,
      createdAt: new Date()
    });
  }

  retrieve(key: string): string | null {
    const tokenData = this.tokens.get(key);
    if (!tokenData || tokenData.expiresAt < new Date()) {
      this.tokens.delete(key);
      return null;
    }
    return this.decrypt(tokenData.value);
  }

  private encrypt(value: string): string {
    // Use WebCrypto API for encryption
    return btoa(value); // Simplified for example
  }
}
```

### 12. Release Management

#### Semantic Versioning Strategy

- **Major**: Breaking API changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, backward compatible

#### Release Checklist

1. ✅ All tests passing
2. ✅ Documentation updated
3. ✅ CHANGELOG.md updated
4. ✅ Version numbers bumped
5. ✅ Security audit clean
6. ✅ Performance benchmarks acceptable
7. ✅ Cross-platform compatibility verified

This implementation guide provides the foundation for building a robust, performant, and maintainable Symbiont JavaScript SDK.