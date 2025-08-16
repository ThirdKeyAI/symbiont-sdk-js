/**
 * HttpEndpointManager - Manages dynamic HTTP endpoints
 * 
 * This class provides functionality for creating, managing, and monitoring
 * HTTP endpoints dynamically at runtime. It includes support for authentication,
 * middleware, metrics tracking, and lifecycle management.
 */

import { EventEmitter } from 'events';
import express, { Express, Request, Response, NextFunction, Router } from 'express';
import { Server } from 'http';
import { AuthUser } from '@symbiont/types';
import { 
  HttpEndpointCreateRequest,
  HttpEndpointInfo,
  HttpEndpointUpdateRequest,
  EndpointListFilter,
  EndpointListResponse,
  HttpEndpointConfig,
  HttpMethod,
  AuthRequirement
} from '@symbiont/types';
import { EndpointMetrics } from './EndpointMetrics';
import { AuthManager } from '../auth/AuthManager';

/**
 * Handler function type for endpoint handlers
 */
export type EndpointHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

/**
 * Middleware function type
 */
export type EndpointMiddleware = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

/**
 * Registry entry for a managed endpoint
 */
interface EndpointRegistry {
  info: HttpEndpointInfo;
  handler: EndpointHandler;
  middleware: EndpointMiddleware[];
  metrics: EndpointMetrics;
  router: Router;
}

export class HttpEndpointManager extends EventEmitter {
  private app: Express;
  private server: Server | null = null;
  private endpoints: Map<string, EndpointRegistry> = new Map();
  private handlerRegistry: Map<string, EndpointHandler> = new Map();
  private middlewareRegistry: Map<string, EndpointMiddleware> = new Map();
  private config: HttpEndpointConfig;
  private authManager?: AuthManager;
  private isStarted: boolean = false;

  constructor(config: HttpEndpointConfig = {}, authManager?: AuthManager) {
    super();
    this.config = {
      port: 3000,
      host: '0.0.0.0',
      cors: true,
      maxBodySize: '10mb',
      timeout: 30000,
      logging: true,
      metrics: true,
      ...config,
    };
    this.authManager = authManager;
    this.app = express();
    this.setupApp();
  }

  /**
   * Starts the HTTP server
   */
  public async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('HTTP server is already started');
    }

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, this.config.host, () => {
        this.isStarted = true;
        this.emit('started', {
          port: this.config.port,
          host: this.config.host,
        });
        resolve();
      });

      this.server.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });
    });
  }

  /**
   * Stops the HTTP server
   */
  public async stop(): Promise<void> {
    if (!this.isStarted || !this.server) {
      return;
    }

    return new Promise((resolve) => {
      this.server?.close(() => {
        this.isStarted = false;
        this.server = null;
        this.emit('stopped');
        resolve();
      });
    });
  }

  /**
   * Registers a handler function that can be used by endpoints
   */
  public registerHandler(name: string, handler: EndpointHandler): void {
    this.handlerRegistry.set(name, handler);
  }

  /**
   * Registers a middleware function that can be used by endpoints
   */
  public registerMiddleware(name: string, middleware: EndpointMiddleware): void {
    this.middlewareRegistry.set(name, middleware);
  }

  /**
   * Creates a new HTTP endpoint
   */
  public async createEndpoint(request: HttpEndpointCreateRequest): Promise<HttpEndpointInfo> {
    const handler = this.handlerRegistry.get(request.handler);
    if (!handler) {
      throw new Error(`Handler '${request.handler}' not found`);
    }

    const middleware: EndpointMiddleware[] = [];
    if (request.middleware) {
      for (const middlewareName of request.middleware) {
        const mw = this.middlewareRegistry.get(middlewareName);
        if (!mw) {
          throw new Error(`Middleware '${middlewareName}' not found`);
        }
        middleware.push(mw);
      }
    }

    const id = this.generateEndpointId(request.path, request.method);
    const now = new Date();
    
    const endpointInfo: HttpEndpointInfo = {
      id,
      path: request.path,
      method: request.method,
      status: 'active',
      handler: request.handler,
      middleware: request.middleware,
      auth: request.auth,
      description: request.description,
      metrics: new EndpointMetrics().toJSON(),
      createdAt: now,
      updatedAt: now,
      metadata: request.metadata,
    };

    const metrics = new EndpointMetrics();
    const router = this.createRouterForEndpoint(endpointInfo, handler, middleware, metrics);

    const registry: EndpointRegistry = {
      info: endpointInfo,
      handler,
      middleware,
      metrics,
      router,
    };

    this.endpoints.set(id, registry);
    this.mountEndpoint(registry);

    this.emit('endpointCreated', endpointInfo);
    return endpointInfo;
  }

  /**
   * Updates an existing endpoint
   */
  public async updateEndpoint(request: HttpEndpointUpdateRequest): Promise<HttpEndpointInfo> {
    const registry = this.endpoints.get(request.id);
    if (!registry) {
      throw new Error(`Endpoint '${request.id}' not found`);
    }

    // Unmount current endpoint
    this.unmountEndpoint(registry);

    // Update handler if provided
    if (request.handler) {
      const handler = this.handlerRegistry.get(request.handler);
      if (!handler) {
        throw new Error(`Handler '${request.handler}' not found`);
      }
      registry.handler = handler;
      registry.info.handler = request.handler;
    }

    // Update middleware if provided
    if (request.middleware) {
      const middleware: EndpointMiddleware[] = [];
      for (const middlewareName of request.middleware) {
        const mw = this.middlewareRegistry.get(middlewareName);
        if (!mw) {
          throw new Error(`Middleware '${middlewareName}' not found`);
        }
        middleware.push(mw);
      }
      registry.middleware = middleware;
      registry.info.middleware = request.middleware;
    }

    // Update other properties
    if (request.auth !== undefined) registry.info.auth = request.auth;
    if (request.description !== undefined) registry.info.description = request.description;
    if (request.status !== undefined) registry.info.status = request.status;
    if (request.metadata !== undefined) registry.info.metadata = request.metadata;

    registry.info.updatedAt = new Date();

    // Recreate and remount router if status is active
    if (registry.info.status === 'active') {
      registry.router = this.createRouterForEndpoint(
        registry.info,
        registry.handler,
        registry.middleware,
        registry.metrics
      );
      this.mountEndpoint(registry);
    }

    this.emit('endpointUpdated', registry.info);
    return registry.info;
  }

  /**
   * Deletes an endpoint
   */
  public async deleteEndpoint(id: string): Promise<void> {
    const registry = this.endpoints.get(id);
    if (!registry) {
      throw new Error(`Endpoint '${id}' not found`);
    }

    this.unmountEndpoint(registry);
    this.endpoints.delete(id);

    this.emit('endpointDeleted', { id, info: registry.info });
  }

  /**
   * Gets information about a specific endpoint
   */
  public getEndpoint(id: string): HttpEndpointInfo | null {
    const registry = this.endpoints.get(id);
    if (!registry) return null;

    // Update metrics in the info object
    registry.info.metrics = registry.metrics.toJSON();
    return { ...registry.info };
  }

  /**
   * Lists endpoints with optional filtering
   */
  public listEndpoints(filter: EndpointListFilter = {}): EndpointListResponse {
    let endpoints = Array.from(this.endpoints.values()).map(registry => {
      registry.info.metrics = registry.metrics.toJSON();
      return { ...registry.info };
    });

    // Apply filters
    if (filter.status) {
      endpoints = endpoints.filter(ep => ep.status === filter.status);
    }
    if (filter.method) {
      endpoints = endpoints.filter(ep => ep.method === filter.method);
    }
    if (filter.pathPattern) {
      const regex = new RegExp(filter.pathPattern);
      endpoints = endpoints.filter(ep => regex.test(ep.path));
    }
    if (filter.handler) {
      endpoints = endpoints.filter(ep => ep.handler === filter.handler);
    }

    const total = endpoints.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;

    endpoints = endpoints.slice(offset, offset + limit);

    return {
      endpoints,
      total,
      offset,
      limit,
    };
  }

  /**
   * Gets the current configuration
   */
  public getConfig(): HttpEndpointConfig {
    return { ...this.config };
  }

  /**
   * Gets server status
   */
  public getStatus(): { isStarted: boolean; port?: number; host?: string; endpointCount: number } {
    return {
      isStarted: this.isStarted,
      port: this.isStarted ? this.config.port : undefined,
      host: this.isStarted ? this.config.host : undefined,
      endpointCount: this.endpoints.size,
    };
  }

  private setupApp(): void {
    // Basic middleware
    this.app.use(express.json({ limit: this.config.maxBodySize }));
    this.app.use(express.urlencoded({ extended: true, limit: this.config.maxBodySize }));

    // CORS if enabled
    if (this.config.cors) {
      this.app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
        } else {
          next();
        }
      });
    }

    // Request timeout
    if (this.config.timeout) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        res.setTimeout(this.config.timeout ?? 30000, () => {
          res.status(408).json({ error: 'Request timeout' });
        });
        next();
      });
    }

    // Request logging
    if (this.config.logging) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();
        res.on('finish', () => {
          const duration = Date.now() - start;
          this.emit('request', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            timestamp: new Date(),
          });
        });
        next();
      });
    }
  }

  private createRouterForEndpoint(
    info: HttpEndpointInfo,
    handler: EndpointHandler,
    middleware: EndpointMiddleware[],
    metrics: EndpointMetrics
  ): Router {
    const router = Router();
    const method = info.method.toLowerCase() as keyof Router;

    const wrappedHandler = this.wrapHandler(handler, metrics, info.auth);
    const allMiddleware = [...middleware, wrappedHandler];

    (router as any)[method](info.path, ...allMiddleware);

    return router;
  }

  private wrapHandler(
    handler: EndpointHandler,
    metrics: EndpointMetrics,
    auth?: AuthRequirement
  ): EndpointHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      metrics.startRequest();

      try {
        // Authentication check
        if (auth?.required && this.authManager) {
          const authHeader = req.headers.authorization;
          if (!authHeader) {
            metrics.recordError(401);
            return res.status(401).json({ error: 'Authentication required' });
          }

          try {
            const token = authHeader.replace('Bearer ', '');
            const user: AuthUser = await this.authManager.validateToken(token);
            
            // Check roles if specified
            if (auth.roles && auth.roles.length > 0) {
              const userRoles = user.roles?.map(r => typeof r === 'string' ? r : r.name) || [];
              const hasRequiredRole = auth.roles.some(role => userRoles.includes(role));
              if (!hasRequiredRole) {
                metrics.recordError(403);
                return res.status(403).json({ error: 'Insufficient permissions' });
              }
            }

            // Attach user to request
            (req as Request & { user: AuthUser }).user = user;
          } catch {
            metrics.recordError(401);
            return res.status(401).json({ error: 'Invalid token' });
          }
        }

        // Call the actual handler
        await handler(req, res, next);

        // Record successful response
        if (!res.headersSent) {
          const responseTime = Date.now() - startTime;
          metrics.recordResponse(responseTime, res.statusCode);
        }
      } catch (error) {
        const responseTime = Date.now() - startTime;
        metrics.recordResponse(responseTime, 500);
        
        this.emit('handlerError', {
          error,
          endpoint: req.path,
          method: req.method,
        });

        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    };
  }

  private mountEndpoint(registry: EndpointRegistry): void {
    if (registry.info.status === 'active') {
      this.app.use('/', registry.router);
    }
  }

  private unmountEndpoint(_registry: EndpointRegistry): void {
    // Express doesn't have a direct way to unmount routes
    // We'll need to recreate the router when remounting
    // This is handled in the update/delete methods
  }

  private generateEndpointId(path: string, method: HttpMethod): string {
    const normalized = path.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = Date.now();
    return `${method.toLowerCase()}_${normalized}_${timestamp}`;
  }
}