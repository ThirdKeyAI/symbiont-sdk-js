import { 
  AuthUser, 
  AuthToken, 
  AuthCredentials, 
  AuthRequest, 
  AuthResponse,
  Role,
  Permission,
  JWTPayload 
} from '@symbiont/types';
import { JWTHandler } from './JWTHandler';
import { TokenValidator } from './TokenValidator';

/**
 * Central authentication manager with JWT and RBAC support
 */
export class AuthManager {
  private jwtHandler: JWTHandler;
  private tokenValidator: TokenValidator;
  private currentUser: AuthUser | null = null;
  private currentToken: AuthToken | null = null;
  private refreshTimeoutId: NodeJS.Timeout | null = null;

  constructor(
    accessSecret: string,
    refreshSecret: string,
    options: {
      accessTokenExpiry?: string;
      refreshTokenExpiry?: string;
      issuer?: string;
      audience?: string;
    } = {}
  ) {
    this.jwtHandler = new JWTHandler(accessSecret, refreshSecret, options);
    this.tokenValidator = new TokenValidator(this.jwtHandler);
  }

  /**
   * Authenticate user with credentials
   */
  async authenticate(request: AuthRequest): Promise<AuthResponse> {
    try {
      const { credentials, requiredRoles = [], requiredPermissions = [] } = request;

      // Handle different authentication methods
      let user: AuthUser;
      
      if (credentials.token) {
        // Token-based authentication
        const validation = await this.tokenValidator.validateToken(credentials.token);
        if (!validation.valid || !validation.payload) {
          return {
            success: false,
            error: validation.error || 'Invalid token',
          };
        }

        user = await this.getUserFromPayload(validation.payload);
      } else if (credentials.username && credentials.password) {
        // Username/password authentication
        user = await this.authenticateWithCredentials(credentials.username, credentials.password);
      } else if (credentials.email && credentials.password) {
        // Email/password authentication
        user = await this.authenticateWithCredentials(credentials.email, credentials.password);
      } else {
        return {
          success: false,
          error: 'Invalid credentials provided',
        };
      }

      // Validate roles and permissions
      if (!this.validateUserAccess(user, requiredRoles, requiredPermissions)) {
        return {
          success: false,
          error: 'Insufficient permissions',
        };
      }

      // Generate new tokens
      const tokenPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
        sub: user.id,
        email: user.email,
        roles: user.roles.map(role => role.name),
        permissions: this.extractPermissions(user.roles),
      };

      const token = this.jwtHandler.generateTokens(tokenPayload);

      // Set current user and token
      this.currentUser = user;
      this.currentToken = token;

      // Schedule token refresh
      this.scheduleTokenRefresh();

      return {
        success: true,
        user,
        token,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    if (this.currentToken) {
      // Blacklist current token
      await this.tokenValidator.blacklistToken(
        this.currentToken.accessToken,
        'User logout'
      );
    }

    this.currentUser = null;
    this.currentToken = null;

    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
      this.refreshTimeoutId = null;
    }
  }

  /**
   * Refresh current token
   */
  async refreshToken(): Promise<AuthToken | null> {
    if (!this.currentToken || !this.currentUser) {
      return null;
    }

    const tokenPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: this.currentUser.id,
      email: this.currentUser.email,
      roles: this.currentUser.roles.map(role => role.name),
      permissions: this.extractPermissions(this.currentUser.roles),
    };

    const newToken = this.jwtHandler.refreshAccessToken(
      this.currentToken.refreshToken,
      tokenPayload
    );

    if (newToken) {
      // Blacklist old token
      await this.tokenValidator.blacklistToken(
        this.currentToken.accessToken,
        'Token refresh'
      );

      this.currentToken = newToken;
      this.scheduleTokenRefresh();
    }

    return newToken;
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * Get current token
   */
  getCurrentToken(): AuthToken | null {
    return this.currentToken;
  }

  /**
   * Check if user has required permissions
   */
  hasPermission(permission: string): boolean {
    if (!this.currentUser) {
      return false;
    }

    const userPermissions = this.extractPermissions(this.currentUser.roles);
    return userPermissions.includes(permission);
  }

  /**
   * Check if user has required role
   */
  hasRole(roleName: string): boolean {
    if (!this.currentUser) {
      return false;
    }

    return this.currentUser.roles.some(role => role.name === roleName);
  }

  /**
   * Validate a token and return user information
   */
  async validateToken(token: string): Promise<AuthUser> {
    const validation = await this.tokenValidator.validateToken(token);
    if (!validation.valid || !validation.payload) {
      throw new Error(validation.error || 'Invalid token');
    }
    return this.getUserFromPayload(validation.payload);
  }

  /**
   * Get authorization headers for requests
   */
  getAuthHeaders(): Record<string, string> {
    if (!this.currentToken) {
      return {};
    }

    return {
      Authorization: `${this.currentToken.tokenType} ${this.currentToken.accessToken}`,
    };
  }

  /**
   * Authenticate with username/password (placeholder implementation)
   */
  private async authenticateWithCredentials(username: string, password: string): Promise<AuthUser> {
    // This is a placeholder implementation
    // In a real application, this would verify credentials against a database
    
    // For demo purposes, create a mock user
    const mockUser: AuthUser = {
      id: '1',
      email: username.includes('@') ? username : `${username}@example.com`,
      roles: [
        {
          id: 'user',
          name: 'user',
          permissions: [
            { id: 'read', resource: 'documents', action: 'read' },
            { id: 'write', resource: 'documents', action: 'write' },
          ],
        },
      ],
      metadata: {
        lastLogin: new Date().toISOString(),
      },
    };

    return mockUser;
  }

  /**
   * Get user from JWT payload
   */
  private async getUserFromPayload(payload: JWTPayload): Promise<AuthUser> {
    // In a real implementation, this would fetch user data from a database
    // For now, reconstruct user from payload
    
    const roles: Role[] = payload.roles.map(roleName => ({
      id: roleName,
      name: roleName,
      permissions: payload.permissions.map(perm => {
        const [resource, action] = perm.split(':');
        return {
          id: perm,
          resource: resource || 'unknown',
          action: action || 'unknown',
        };
      }),
    }));

    return {
      id: payload.sub,
      email: payload.email,
      roles,
      metadata: {
        lastTokenRefresh: new Date().toISOString(),
      },
    };
  }

  /**
   * Extract all permissions from user roles
   */
  private extractPermissions(roles: Role[]): string[] {
    const permissions = new Set<string>();
    
    for (const role of roles) {
      for (const permission of role.permissions) {
        permissions.add(`${permission.resource}:${permission.action}`);
      }
    }

    return Array.from(permissions);
  }

  /**
   * Validate user access against required roles and permissions
   */
  private validateUserAccess(
    user: AuthUser,
    requiredRoles: string[],
    requiredPermissions: string[]
  ): boolean {
    const userRoles = user.roles.map(role => role.name);
    const userPermissions = this.extractPermissions(user.roles);

    // Check roles
    const hasRequiredRoles = requiredRoles.length === 0 || 
      requiredRoles.some(role => userRoles.includes(role));

    // Check permissions
    const hasRequiredPermissions = requiredPermissions.length === 0 ||
      requiredPermissions.every(permission => userPermissions.includes(permission));

    return hasRequiredRoles && hasRequiredPermissions;
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(): void {
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
    }

    if (!this.currentToken) {
      return;
    }

    // Refresh token 5 minutes before expiration
    const refreshTime = this.currentToken.expiresAt.getTime() - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimeoutId = setTimeout(() => {
        this.refreshToken();
      }, refreshTime);
    }
  }
}