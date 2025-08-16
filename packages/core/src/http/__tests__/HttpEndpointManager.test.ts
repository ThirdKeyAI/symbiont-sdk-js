import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { HttpEndpointManager } from '../HttpEndpointManager';
import { EndpointMetrics } from '../EndpointMetrics';
import { AuthManager } from '../../auth/AuthManager';

// Define interfaces locally for testing
enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD'
}

interface AuthRequirement {
  required: boolean;
  roles?: string[];
  permissions?: string[];
  scope?: string;
}

interface HttpEndpointCreateRequest {
  path: string;
  method: HttpMethod;
  handler: string;
  middleware?: string[];
  auth?: AuthRequirement;
  description?: string;
  metadata?: Record<string, any>;
}

interface HttpEndpointUpdateRequest {
  id: string;
  handler?: string;
  middleware?: string[];
  auth?: AuthRequirement;
  description?: string;
  status?: 'active' | 'inactive';
  metadata?: Record<string, any>;
}

interface EndpointListFilter {
  status?: 'active' | 'inactive' | 'error';
  method?: HttpMethod;
  pathPattern?: string;
  handler?: string;
  offset?: number;
  limit?: number;
}

interface HttpEndpointConfig {
  port?: number;
  host?: string;
  cors?: boolean;
  maxBodySize?: string;
  timeout?: number;
  logging?: boolean;
  metrics?: boolean;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

// Mock Express and HTTP server
const mockApp = {
  use: vi.fn(),
  listen: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  options: vi.fn(),
  head: vi.fn(),
};

const mockServer = {
  close: vi.fn(),
  on: vi.fn(),
};

const mockRouter = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  options: vi.fn(),
  head: vi.fn(),
};

vi.mock('express', () => {
  const mockExpress = () => mockApp;
  mockExpress.json = vi.fn(() => 'json-middleware');
  mockExpress.urlencoded = vi.fn(() => 'urlencoded-middleware');
  mockExpress.Router = vi.fn(() => mockRouter);
  
  return {
    default: mockExpress,
    Router: vi.fn(() => mockRouter),
    json: vi.fn(() => 'json-middleware'),
    urlencoded: vi.fn(() => 'urlencoded-middleware'),
  };
});

// Mock EndpointMetrics
const mockToJSON = vi.fn().mockReturnValue({
  requestCount: 0,
  averageResponseTime: 0,
  errorRate: 0,
  lastAccessed: new Date(),
  statusCodes: {},
  peakRpm: 0,
  activeRequests: 0,
});

vi.mock('../EndpointMetrics', () => ({
  EndpointMetrics: vi.fn().mockImplementation(() => ({
    toJSON: mockToJSON,
    startRequest: vi.fn(),
    recordResponse: vi.fn(),
    recordError: vi.fn(),
    reset: vi.fn(),
  })),
}));

describe('HttpEndpointManager', () => {
  let manager: HttpEndpointManager;
  let mockAuthManager: Partial<AuthManager>;
  let config: HttpEndpointConfig;

  const mockHandler = vi.fn();
  const mockMiddleware = vi.fn();

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    mockAuthManager = {
      validateToken: vi.fn().mockResolvedValue({
        id: 'user123',
        username: 'testuser',
        roles: [{ name: 'admin' }],
      }),
    };

    config = {
      port: 3000,
      host: '0.0.0.0',
      cors: true,
      maxBodySize: '10mb',
      timeout: 30000,
      logging: true,
      metrics: true,
    };

    manager = new HttpEndpointManager(config, mockAuthManager as AuthManager);

    // Setup mock implementations
    mockApp.listen.mockImplementation((port, host, callback) => {
      setTimeout(() => callback(), 0);
      return mockServer;
    });

    mockServer.close.mockImplementation((callback) => {
      setTimeout(() => callback(), 0);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultManager = new HttpEndpointManager();

      expect(defaultManager.getConfig()).toEqual({
        port: 3000,
        host: '0.0.0.0',
        cors: true,
        maxBodySize: '10mb',
        timeout: 30000,
        logging: true,
        metrics: true,
      });
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig = {
        port: 8080,
        host: 'localhost',
        cors: false,
      };

      const customManager = new HttpEndpointManager(customConfig);

      expect(customManager.getConfig()).toEqual({
        port: 8080,
        host: 'localhost',
        cors: false,
        maxBodySize: '10mb',
        timeout: 30000,
        logging: true,
        metrics: true,
      });
    });

    it('should setup Express app with middleware', () => {
      expect(mockApp.use).toHaveBeenCalledWith('json-middleware');
      expect(mockApp.use).toHaveBeenCalledWith('urlencoded-middleware');
      expect(mockApp.use).toHaveBeenCalledTimes(5); // json, urlencoded, cors, timeout, logging
    });

    it('should initialize as EventEmitter', () => {
      expect(manager).toBeInstanceOf(EventEmitter);
    });
  });

  describe('server lifecycle', () => {
    describe('start', () => {
      it('should start HTTP server successfully', async () => {
        const startedSpy = vi.fn();
        manager.on('started', startedSpy);

        await manager.start();

        expect(mockApp.listen).toHaveBeenCalledWith(3000, '0.0.0.0', expect.any(Function));
        expect(startedSpy).toHaveBeenCalledWith({
          port: 3000,
          host: '0.0.0.0',
        });
        expect(manager.getStatus().isStarted).toBe(true);
      });

      it('should throw error if server is already started', async () => {
        await manager.start();

        await expect(manager.start()).rejects.toThrow('HTTP server is already started');
      });

      it('should handle server start errors', async () => {
        const error = new Error('Port already in use');
        mockApp.listen.mockImplementation((port, host, callback) => {
          const mockServer = {
            on: vi.fn().mockImplementation((event, handler) => {
              if (event === 'error') {
                setTimeout(() => handler(error), 0);
              }
            }),
          };
          return mockServer;
        });

        const errorSpy = vi.fn();
        manager.on('error', errorSpy);

        await expect(manager.start()).rejects.toThrow('Port already in use');
        expect(errorSpy).toHaveBeenCalledWith(error);
      });
    });

    describe('stop', () => {
      it('should stop HTTP server successfully', async () => {
        await manager.start();

        const stoppedSpy = vi.fn();
        manager.on('stopped', stoppedSpy);

        await manager.stop();

        expect(mockServer.close).toHaveBeenCalledWith(expect.any(Function));
        expect(stoppedSpy).toHaveBeenCalled();
        expect(manager.getStatus().isStarted).toBe(false);
      });

      it('should handle stop when server is not started', async () => {
        await manager.stop(); // Should not throw
        expect(mockServer.close).not.toHaveBeenCalled();
      });
    });
  });

  describe('handler and middleware registration', () => {
    it('should register handler function', () => {
      manager.registerHandler('testHandler', mockHandler);

      // Test that handler is registered by trying to create endpoint
      const createRequest: HttpEndpointCreateRequest = {
        path: '/test',
        method: HttpMethod.GET,
        handler: 'testHandler',
      };

      expect(() => manager.createEndpoint(createRequest)).not.toThrow();
    });

    it('should register middleware function', () => {
      manager.registerMiddleware('testMiddleware', mockMiddleware);
      manager.registerHandler('testHandler', mockHandler);

      const createRequest: HttpEndpointCreateRequest = {
        path: '/test',
        method: HttpMethod.GET,
        handler: 'testHandler',
        middleware: ['testMiddleware'],
      };

      expect(() => manager.createEndpoint(createRequest)).not.toThrow();
    });
  });

  describe('endpoint creation', () => {
    beforeEach(() => {
      manager.registerHandler('testHandler', mockHandler);
      manager.registerMiddleware('testMiddleware', mockMiddleware);
    });

    it('should create endpoint successfully', async () => {
      const createRequest: HttpEndpointCreateRequest = {
        path: '/api/test',
        method: HttpMethod.GET,
        handler: 'testHandler',
        description: 'Test endpoint',
        metadata: { version: '1.0' },
      };

      const createdSpy = vi.fn();
      manager.on('endpointCreated', createdSpy);

      const endpoint = await manager.createEndpoint(createRequest);

      expect(endpoint).toMatchObject({
        path: '/api/test',
        method: HttpMethod.GET,
        status: 'active',
        handler: 'testHandler',
        description: 'Test endpoint',
        metadata: { version: '1.0' },
      });

      expect(endpoint.id).toBeDefined();
      expect(endpoint.createdAt).toBeInstanceOf(Date);
      expect(endpoint.updatedAt).toBeInstanceOf(Date);
      expect(endpoint.metrics).toBeDefined();

      expect(createdSpy).toHaveBeenCalledWith(endpoint);
      expect(mockApp.use).toHaveBeenCalledWith('/', mockRouter);
    });

    it('should create endpoint with middleware', async () => {
      const createRequest: HttpEndpointCreateRequest = {
        path: '/api/test',
        method: HttpMethod.POST,
        handler: 'testHandler',
        middleware: ['testMiddleware'],
      };

      const endpoint = await manager.createEndpoint(createRequest);

      expect(endpoint.middleware).toEqual(['testMiddleware']);
    });

    it('should create endpoint with authentication', async () => {
      const auth: AuthRequirement = {
        required: true,
        roles: ['admin'],
      };

      const createRequest: HttpEndpointCreateRequest = {
        path: '/api/admin',
        method: HttpMethod.DELETE,
        handler: 'testHandler',
        auth,
      };

      const endpoint = await manager.createEndpoint(createRequest);

      expect(endpoint.auth).toEqual(auth);
    });

    it('should throw error for unknown handler', async () => {
      const createRequest: HttpEndpointCreateRequest = {
        path: '/api/test',
        method: HttpMethod.GET,
        handler: 'unknownHandler',
      };

      await expect(manager.createEndpoint(createRequest)).rejects.toThrow(
        'Handler \'unknownHandler\' not found'
      );
    });

    it('should throw error for unknown middleware', async () => {
      const createRequest: HttpEndpointCreateRequest = {
        path: '/api/test',
        method: HttpMethod.GET,
        handler: 'testHandler',
        middleware: ['unknownMiddleware'],
      };

      await expect(manager.createEndpoint(createRequest)).rejects.toThrow(
        'Middleware \'unknownMiddleware\' not found'
      );
    });
  });

  describe('endpoint update', () => {
    let endpointId: string;

    beforeEach(async () => {
      manager.registerHandler('testHandler', mockHandler);
      manager.registerHandler('newHandler', vi.fn());
      manager.registerMiddleware('testMiddleware', mockMiddleware);
      manager.registerMiddleware('newMiddleware', vi.fn());

      const createRequest: HttpEndpointCreateRequest = {
        path: '/api/test',
        method: HttpMethod.GET,
        handler: 'testHandler',
        description: 'Original description',
      };

      const endpoint = await manager.createEndpoint(createRequest);
      endpointId = endpoint.id;
    });

    it('should update endpoint handler', async () => {
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updateRequest: HttpEndpointUpdateRequest = {
        id: endpointId,
        handler: 'newHandler',
      };

      const updatedSpy = vi.fn();
      manager.on('endpointUpdated', updatedSpy);

      const updatedEndpoint = await manager.updateEndpoint(updateRequest);

      expect(updatedEndpoint.handler).toBe('newHandler');
      expect(updatedEndpoint.updatedAt.getTime()).toBeGreaterThan(updatedEndpoint.createdAt.getTime());
      expect(updatedSpy).toHaveBeenCalledWith(updatedEndpoint);
    });

    it('should update endpoint middleware', async () => {
      const updateRequest: HttpEndpointUpdateRequest = {
        id: endpointId,
        middleware: ['testMiddleware', 'newMiddleware'],
      };

      const updatedEndpoint = await manager.updateEndpoint(updateRequest);

      expect(updatedEndpoint.middleware).toEqual(['testMiddleware', 'newMiddleware']);
    });

    it('should update endpoint status', async () => {
      const updateRequest: HttpEndpointUpdateRequest = {
        id: endpointId,
        status: 'inactive',
      };

      const updatedEndpoint = await manager.updateEndpoint(updateRequest);

      expect(updatedEndpoint.status).toBe('inactive');
    });

    it('should update multiple properties', async () => {
      const updateRequest: HttpEndpointUpdateRequest = {
        id: endpointId,
        handler: 'newHandler',
        description: 'Updated description',
        metadata: { version: '2.0' },
      };

      const updatedEndpoint = await manager.updateEndpoint(updateRequest);

      expect(updatedEndpoint.handler).toBe('newHandler');
      expect(updatedEndpoint.description).toBe('Updated description');
      expect(updatedEndpoint.metadata).toEqual({ version: '2.0' });
    });

    it('should throw error for non-existent endpoint', async () => {
      const updateRequest: HttpEndpointUpdateRequest = {
        id: 'non-existent-id',
        handler: 'newHandler',
      };

      await expect(manager.updateEndpoint(updateRequest)).rejects.toThrow(
        'Endpoint \'non-existent-id\' not found'
      );
    });

    it('should throw error for unknown handler', async () => {
      const updateRequest: HttpEndpointUpdateRequest = {
        id: endpointId,
        handler: 'unknownHandler',
      };

      await expect(manager.updateEndpoint(updateRequest)).rejects.toThrow(
        'Handler \'unknownHandler\' not found'
      );
    });
  });

  describe('endpoint deletion', () => {
    let endpointId: string;

    beforeEach(async () => {
      manager.registerHandler('testHandler', mockHandler);

      const createRequest: HttpEndpointCreateRequest = {
        path: '/api/test',
        method: HttpMethod.GET,
        handler: 'testHandler',
      };

      const endpoint = await manager.createEndpoint(createRequest);
      endpointId = endpoint.id;
    });

    it('should delete endpoint successfully', async () => {
      const deletedSpy = vi.fn();
      manager.on('endpointDeleted', deletedSpy);

      await manager.deleteEndpoint(endpointId);

      expect(manager.getEndpoint(endpointId)).toBeNull();
      expect(deletedSpy).toHaveBeenCalledWith({
        id: endpointId,
        info: expect.any(Object),
      });
    });

    it('should throw error for non-existent endpoint', async () => {
      await expect(manager.deleteEndpoint('non-existent-id')).rejects.toThrow(
        'Endpoint \'non-existent-id\' not found'
      );
    });
  });

  describe('endpoint retrieval', () => {
    let endpointId: string;

    beforeEach(async () => {
      manager.registerHandler('testHandler', mockHandler);

      const createRequest: HttpEndpointCreateRequest = {
        path: '/api/test',
        method: HttpMethod.GET,
        handler: 'testHandler',
      };

      const endpoint = await manager.createEndpoint(createRequest);
      endpointId = endpoint.id;
    });

    it('should get endpoint by ID', () => {
      const endpoint = manager.getEndpoint(endpointId);

      expect(endpoint).not.toBeNull();
      expect(endpoint!.id).toBe(endpointId);
      expect(endpoint!.path).toBe('/api/test');
    });

    it('should return null for non-existent endpoint', () => {
      const endpoint = manager.getEndpoint('non-existent-id');

      expect(endpoint).toBeNull();
    });

    it('should update metrics in endpoint info', () => {
      const endpoint = manager.getEndpoint(endpointId);

      expect(endpoint!.metrics).toBeDefined();
      expect(mockToJSON).toHaveBeenCalled();
    });
  });

  describe('endpoint listing', () => {
    beforeEach(async () => {
      manager.registerHandler('handler1', mockHandler);
      manager.registerHandler('handler2', vi.fn());

      const endpoints = [
        {
          path: '/api/users',
          method: HttpMethod.GET,
          handler: 'handler1',
        },
        {
          path: '/api/users',
          method: HttpMethod.POST,
          handler: 'handler2',
        },
        {
          path: '/api/admin',
          method: HttpMethod.GET,
          handler: 'handler1',
        },
      ];

      for (const endpoint of endpoints) {
        await manager.createEndpoint(endpoint);
      }

      // Update one endpoint to inactive status
      const allEndpoints = manager.listEndpoints();
      await manager.updateEndpoint({
        id: allEndpoints.endpoints[2].id,
        status: 'inactive',
      });
    });

    it('should list all endpoints without filter', () => {
      const result = manager.listEndpoints();

      expect(result.endpoints).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(50);
    });

    it('should filter by status', () => {
      const filter: EndpointListFilter = {
        status: 'active',
      };

      const result = manager.listEndpoints(filter);

      expect(result.endpoints).toHaveLength(2);
      expect(result.endpoints.every(ep => ep.status === 'active')).toBe(true);
    });

    it('should filter by method', () => {
      const filter: EndpointListFilter = {
        method: HttpMethod.GET,
      };

      const result = manager.listEndpoints(filter);

      expect(result.endpoints).toHaveLength(2);
      expect(result.endpoints.every(ep => ep.method === HttpMethod.GET)).toBe(true);
    });

    it('should filter by path pattern', () => {
      const filter: EndpointListFilter = {
        pathPattern: '/api/users',
      };

      const result = manager.listEndpoints(filter);

      expect(result.endpoints).toHaveLength(2);
      expect(result.endpoints.every(ep => ep.path === '/api/users')).toBe(true);
    });

    it('should filter by handler', () => {
      const filter: EndpointListFilter = {
        handler: 'handler1',
      };

      const result = manager.listEndpoints(filter);

      expect(result.endpoints).toHaveLength(2);
      expect(result.endpoints.every(ep => ep.handler === 'handler1')).toBe(true);
    });

    it('should handle pagination', () => {
      const filter: EndpointListFilter = {
        offset: 1,
        limit: 1,
      };

      const result = manager.listEndpoints(filter);

      expect(result.endpoints).toHaveLength(1);
      expect(result.total).toBe(3);
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(1);
    });

    it('should combine multiple filters', () => {
      const filter: EndpointListFilter = {
        status: 'active',
        method: HttpMethod.GET,
        handler: 'handler1',
      };

      const result = manager.listEndpoints(filter);

      expect(result.endpoints).toHaveLength(1);
      expect(result.endpoints[0].path).toBe('/api/users');
    });
  });

  describe('status and configuration', () => {
    it('should return current status when stopped', () => {
      const status = manager.getStatus();

      expect(status).toEqual({
        isStarted: false,
        port: undefined,
        host: undefined,
        endpointCount: 0,
      });
    });

    it('should return current status when started', async () => {
      await manager.start();

      const status = manager.getStatus();

      expect(status).toEqual({
        isStarted: true,
        port: 3000,
        host: '0.0.0.0',
        endpointCount: 0,
      });
    });

    it('should return configuration', () => {
      const config = manager.getConfig();

      expect(config).toEqual({
        port: 3000,
        host: '0.0.0.0',
        cors: true,
        maxBodySize: '10mb',
        timeout: 30000,
        logging: true,
        metrics: true,
      });
    });
  });

  describe('request handling and authentication', () => {
    let endpointId: string;
    let mockReq: any;
    let mockRes: any;
    let mockNext: any;

    beforeEach(async () => {
      mockReq = {
        method: 'GET',
        path: '/api/test',
        headers: {},
      };

      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        header: vi.fn().mockReturnThis(),
        headersSent: false,
        statusCode: 200,
      };

      mockNext = vi.fn();

      manager.registerHandler('authTestHandler', mockHandler);

      const createRequest: HttpEndpointCreateRequest = {
        path: '/api/test',
        method: HttpMethod.GET,
        handler: 'authTestHandler',
        auth: {
          required: true,
          roles: ['admin'],
        },
      };

      const endpoint = await manager.createEndpoint(createRequest);
      endpointId = endpoint.id;
    });

    it('should handle authenticated request successfully', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';

      // Get the wrapped handler that was created (last argument in router call)
      const registry = (manager as any).endpoints.get(endpointId);
      const routerCall = registry.router.get.mock.calls[0];
      const wrappedHandler = routerCall[routerCall.length - 1]; // Last middleware is the wrapped handler

      await wrappedHandler(mockReq, mockRes, mockNext);

      expect(mockAuthManager.validateToken).toHaveBeenCalledWith('valid-token');
      expect(mockReq.user).toBeDefined();
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      const registry = (manager as any).endpoints.get(endpointId);
      const routerCall = registry.router.get.mock.calls[0];
      const wrappedHandler = routerCall[routerCall.length - 1];

      await wrappedHandler(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';
      mockAuthManager.validateToken = vi.fn().mockRejectedValue(new Error('Invalid token'));

      const registry = (manager as any).endpoints.get(endpointId);
      const routerCall = registry.router.get.mock.calls[0];
      const wrappedHandler = routerCall[routerCall.length - 1];

      await wrappedHandler(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should reject request without required role', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      mockAuthManager.validateToken = vi.fn().mockResolvedValue({
        id: 'user123',
        username: 'testuser',
        roles: [{ name: 'user' }], // Not admin
      });

      const registry = (manager as any).endpoints.get(endpointId);
      const routerCall = registry.router.get.mock.calls[0];
      const wrappedHandler = routerCall[routerCall.length - 1];

      await wrappedHandler(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle handler errors gracefully', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
      manager.registerHandler('errorHandler', errorHandler);

      const createRequest: HttpEndpointCreateRequest = {
        path: '/api/error',
        method: HttpMethod.GET,
        handler: 'errorHandler',
      };

      const endpoint = await manager.createEndpoint(createRequest);

      const errorSpy = vi.fn();
      manager.on('handlerError', errorSpy);

      const mockReq = { method: 'GET', path: '/api/error' };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        header: vi.fn().mockReturnThis(),
        headersSent: false,
        statusCode: 200,
      };

      const registry = (manager as any).endpoints.get(endpoint.id);
      const routerCall = registry.router.get.mock.calls[0];
      const wrappedHandler = routerCall[routerCall.length - 1];

      await wrappedHandler(mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal server error' });
      expect(errorSpy).toHaveBeenCalledWith({
        error: expect.any(Error),
        endpoint: '/api/error',
        method: 'GET',
      });
    });
  });

  describe('event emission', () => {
    it('should emit request events when logging is enabled', async () => {
      const requestSpy = vi.fn();
      manager.on('request', requestSpy);

      // Simulate the logging middleware
      const mockReq = { method: 'GET', path: '/api/test' };
      const mockRes = {
        on: vi.fn().mockImplementation((event, callback) => {
          if (event === 'finish') {
            // Simulate response finish immediately
            mockRes.statusCode = 200;
            callback();
          }
          return mockRes;
        }),
        header: vi.fn().mockReturnThis(),
        statusCode: 200,
      };

      // Find the logging middleware (it should be the last function-only middleware)
      const loggingMiddleware = mockApp.use.mock.calls
        .filter(call => call.length === 1 && typeof call[0] === 'function')
        .pop()?.[0];

      expect(loggingMiddleware).toBeDefined();

      // Call the logging middleware with next function
      const mockNext = vi.fn();
      loggingMiddleware(mockReq, mockRes, mockNext);

      // Trigger the 'finish' event manually
      const finishHandler = mockRes.on.mock.calls.find(call => call[0] === 'finish')?.[1];
      if (finishHandler) {
        finishHandler();
      }

      // Verify the request event was emitted
      expect(requestSpy).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        duration: expect.any(Number),
        timestamp: expect.any(Date),
      });
    });
  });
});