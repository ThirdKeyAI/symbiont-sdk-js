import { Role, Permission, AuthUser } from '@symbiont/types';

/**
 * Role-Based Access Control (RBAC) Manager
 */
export class RBACManager {
  private roles: Map<string, Role> = new Map();
  private permissions: Map<string, Permission> = new Map();

  /**
   * Create a new role
   */
  createRole(role: Role): void {
    this.roles.set(role.id, role);
  }

  /**
   * Create a new permission
   */
  createPermission(permission: Permission): void {
    this.permissions.set(permission.id, permission);
  }

  /**
   * Get role by ID
   */
  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  /**
   * Get permission by ID
   */
  getPermission(permissionId: string): Permission | undefined {
    return this.permissions.get(permissionId);
  }

  /**
   * Add permission to role
   */
  addPermissionToRole(roleId: string, permissionId: string): boolean {
    const role = this.roles.get(roleId);
    const permission = this.permissions.get(permissionId);

    if (!role || !permission) {
      return false;
    }

    // Check if permission already exists
    if (!role.permissions.find(p => p.id === permissionId)) {
      role.permissions.push(permission);
    }

    return true;
  }

  /**
   * Remove permission from role
   */
  removePermissionFromRole(roleId: string, permissionId: string): boolean {
    const role = this.roles.get(roleId);

    if (!role) {
      return false;
    }

    role.permissions = role.permissions.filter(p => p.id !== permissionId);
    return true;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(user: AuthUser, resource: string, action: string, scope?: string): boolean {
    for (const role of user.roles) {
      for (const permission of role.permissions) {
        // Check resource match (exact or wildcard)
        const resourceMatch = permission.resource === resource || permission.resource === '*';
        
        // Check action match (exact or wildcard)
        const actionMatch = permission.action === action || permission.action === '*';
        
        // Check scope match
        let scopeMatch = false;
        if (permission.scope === '*') {
          // Wildcard permission scope matches any request
          scopeMatch = true;
        } else if (!permission.scope) {
          // Permission has no scope requirement, matches requests without scope
          scopeMatch = !scope;
        } else if (scope) {
          // Both permission and request have scope, must match exactly
          scopeMatch = permission.scope === scope;
        } else {
          // Permission requires scope but request has none
          scopeMatch = false;
        }
        
        if (resourceMatch && actionMatch && scopeMatch) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(user: AuthUser, roleNames: string[]): boolean {
    const userRoleNames = user.roles.map(role => role.name);
    return roleNames.some(roleName => userRoleNames.includes(roleName));
  }

  /**
   * Check if user has all of the specified roles
   */
  hasAllRoles(user: AuthUser, roleNames: string[]): boolean {
    const userRoleNames = user.roles.map(role => role.name);
    return roleNames.every(roleName => userRoleNames.includes(roleName));
  }

  /**
   * Get all permissions for a user
   */
  getUserPermissions(user: AuthUser): Permission[] {
    const permissions: Permission[] = [];
    const permissionIds = new Set<string>();

    for (const role of user.roles) {
      for (const permission of role.permissions) {
        if (!permissionIds.has(permission.id)) {
          permissions.push(permission);
          permissionIds.add(permission.id);
        }
      }
    }

    return permissions;
  }

  /**
   * Get all roles
   */
  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get all permissions
   */
  getAllPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Initialize default roles and permissions
   */
  initializeDefaults(): void {
    // Default permissions
    const permissions = [
      { id: 'read:documents', resource: 'documents', action: 'read' },
      { id: 'write:documents', resource: 'documents', action: 'write' },
      { id: 'delete:documents', resource: 'documents', action: 'delete' },
      { id: 'read:users', resource: 'users', action: 'read' },
      { id: 'write:users', resource: 'users', action: 'write' },
      { id: 'delete:users', resource: 'users', action: 'delete' },
      { id: 'read:settings', resource: 'settings', action: 'read' },
      { id: 'write:settings', resource: 'settings', action: 'write' },
      { id: 'admin:all', resource: '*', action: '*', scope: '*' },
    ];

    permissions.forEach(permission => this.createPermission(permission));

    // Default roles
    const guestRole: Role = {
      id: 'guest',
      name: 'guest',
      description: 'Basic guest access',
      permissions: [
        this.permissions.get('read:documents')!,
      ].filter(Boolean),
    };

    const userRole: Role = {
      id: 'user',
      name: 'user',
      description: 'Standard user access',
      permissions: [
        this.permissions.get('read:documents')!,
        this.permissions.get('write:documents')!,
        this.permissions.get('read:users')!,
      ].filter(Boolean),
    };

    const moderatorRole: Role = {
      id: 'moderator',
      name: 'moderator',
      description: 'Moderator access',
      permissions: [
        this.permissions.get('read:documents')!,
        this.permissions.get('write:documents')!,
        this.permissions.get('delete:documents')!,
        this.permissions.get('read:users')!,
        this.permissions.get('write:users')!,
      ].filter(Boolean),
    };

    const adminRole: Role = {
      id: 'admin',
      name: 'admin',
      description: 'Administrator access',
      permissions: [
        this.permissions.get('admin:all')!,
      ].filter(Boolean),
    };

    [guestRole, userRole, moderatorRole, adminRole].forEach(role => 
      this.createRole(role)
    );
  }
}