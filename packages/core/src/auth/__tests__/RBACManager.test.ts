import { describe, it, expect, beforeEach } from 'vitest';
import { RBACManager } from '../RBACManager';
import { Role, Permission, AuthUser } from '@symbiont/types';

describe('RBACManager', () => {
  let rbacManager: RBACManager;

  beforeEach(() => {
    rbacManager = new RBACManager();
  });

  describe('Permission Management', () => {
    const readDocsPermission: Permission = {
      id: 'read:documents',
      resource: 'documents',
      action: 'read'
    };

    const writeDocsPermission: Permission = {
      id: 'write:documents',
      resource: 'documents',
      action: 'write'
    };

    it('should create and retrieve permissions', () => {
      rbacManager.createPermission(readDocsPermission);
      
      const retrieved = rbacManager.getPermission('read:documents');
      expect(retrieved).toEqual(readDocsPermission);
    });

    it('should return undefined for non-existent permission', () => {
      const retrieved = rbacManager.getPermission('non:existent');
      expect(retrieved).toBeUndefined();
    });

    it('should get all permissions', () => {
      rbacManager.createPermission(readDocsPermission);
      rbacManager.createPermission(writeDocsPermission);
      
      const allPermissions = rbacManager.getAllPermissions();
      expect(allPermissions).toHaveLength(2);
      expect(allPermissions).toContainEqual(readDocsPermission);
      expect(allPermissions).toContainEqual(writeDocsPermission);
    });
  });

  describe('Role Management', () => {
    const readDocsPermission: Permission = {
      id: 'read:documents',
      resource: 'documents',
      action: 'read'
    };

    const writeDocsPermission: Permission = {
      id: 'write:documents',
      resource: 'documents',
      action: 'write'
    };

    const userRole: Role = {
      id: 'user',
      name: 'user',
      description: 'Standard user',
      permissions: [readDocsPermission]
    };

    beforeEach(() => {
      rbacManager.createPermission(readDocsPermission);
      rbacManager.createPermission(writeDocsPermission);
    });

    it('should create and retrieve roles', () => {
      rbacManager.createRole(userRole);
      
      const retrieved = rbacManager.getRole('user');
      expect(retrieved).toEqual(userRole);
    });

    it('should return undefined for non-existent role', () => {
      const retrieved = rbacManager.getRole('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should get all roles', () => {
      const adminRole: Role = {
        id: 'admin',
        name: 'admin',
        description: 'Administrator',
        permissions: [readDocsPermission, writeDocsPermission]
      };

      rbacManager.createRole(userRole);
      rbacManager.createRole(adminRole);
      
      const allRoles = rbacManager.getAllRoles();
      expect(allRoles).toHaveLength(2);
      expect(allRoles).toContainEqual(userRole);
      expect(allRoles).toContainEqual(adminRole);
    });
  });

  describe('Permission Assignment', () => {
    const readDocsPermission: Permission = {
      id: 'read:documents',
      resource: 'documents',
      action: 'read'
    };

    const writeDocsPermission: Permission = {
      id: 'write:documents',
      resource: 'documents',
      action: 'write'
    };

    const userRole: Role = {
      id: 'user',
      name: 'user',
      description: 'Standard user',
      permissions: []
    };

    beforeEach(() => {
      rbacManager.createPermission(readDocsPermission);
      rbacManager.createPermission(writeDocsPermission);
      rbacManager.createRole(userRole);
    });

    it('should add permission to role', () => {
      const success = rbacManager.addPermissionToRole('user', 'read:documents');
      expect(success).toBe(true);
      
      const role = rbacManager.getRole('user');
      expect(role?.permissions).toContainEqual(readDocsPermission);
    });

    it('should not add non-existent permission to role', () => {
      const success = rbacManager.addPermissionToRole('user', 'non:existent');
      expect(success).toBe(false);
    });

    it('should not add permission to non-existent role', () => {
      const success = rbacManager.addPermissionToRole('non-existent', 'read:documents');
      expect(success).toBe(false);
    });

    it('should not add duplicate permissions', () => {
      rbacManager.addPermissionToRole('user', 'read:documents');
      rbacManager.addPermissionToRole('user', 'read:documents');
      
      const role = rbacManager.getRole('user');
      expect(role?.permissions).toHaveLength(1);
    });

    it('should remove permission from role', () => {
      rbacManager.addPermissionToRole('user', 'read:documents');
      rbacManager.addPermissionToRole('user', 'write:documents');
      
      const success = rbacManager.removePermissionFromRole('user', 'read:documents');
      expect(success).toBe(true);
      
      const role = rbacManager.getRole('user');
      expect(role?.permissions).toHaveLength(1);
      expect(role?.permissions).toContainEqual(writeDocsPermission);
      expect(role?.permissions).not.toContainEqual(readDocsPermission);
    });

    it('should handle removing permission from non-existent role', () => {
      const success = rbacManager.removePermissionFromRole('non-existent', 'read:documents');
      expect(success).toBe(false);
    });
  });

  describe('Permission Checking', () => {
    const readDocsPermission: Permission = {
      id: 'read:documents',
      resource: 'documents',
      action: 'read'
    };

    const writeDocsPermission: Permission = {
      id: 'write:documents',
      resource: 'documents',
      action: 'write'
    };

    const adminPermission: Permission = {
      id: 'admin:all',
      resource: '*',
      action: '*',
      scope: '*'
    };

    const userRole: Role = {
      id: 'user',
      name: 'user',
      description: 'Standard user',
      permissions: [readDocsPermission]
    };

    const editorRole: Role = {
      id: 'editor',
      name: 'editor',
      description: 'Editor',
      permissions: [readDocsPermission, writeDocsPermission]
    };

    const adminRole: Role = {
      id: 'admin',
      name: 'admin',
      description: 'Administrator',
      permissions: [adminPermission]
    };

    const regularUser: AuthUser = {
      id: 'user1',
      email: 'user@example.com',
      roles: [userRole]
    };

    const editorUser: AuthUser = {
      id: 'editor1',
      email: 'editor@example.com',
      roles: [editorRole]
    };

    const adminUser: AuthUser = {
      id: 'admin1',
      email: 'admin@example.com',
      roles: [adminRole]
    };

    it('should check user permissions correctly', () => {
      expect(rbacManager.hasPermission(regularUser, 'documents', 'read')).toBe(true);
      expect(rbacManager.hasPermission(regularUser, 'documents', 'write')).toBe(false);
      
      expect(rbacManager.hasPermission(editorUser, 'documents', 'read')).toBe(true);
      expect(rbacManager.hasPermission(editorUser, 'documents', 'write')).toBe(true);
      expect(rbacManager.hasPermission(editorUser, 'users', 'read')).toBe(false);
    });

    it('should handle wildcard permissions', () => {
      expect(rbacManager.hasPermission(adminUser, 'documents', 'read')).toBe(true);
      expect(rbacManager.hasPermission(adminUser, 'documents', 'write')).toBe(true);
      expect(rbacManager.hasPermission(adminUser, 'users', 'delete')).toBe(true);
      expect(rbacManager.hasPermission(adminUser, 'anything', 'anything')).toBe(true);
    });

    it('should handle scope checking', () => {
      const scopedPermission: Permission = {
        id: 'read:documents:public',
        resource: 'documents',
        action: 'read',
        scope: 'public'
      };

      const scopedRole: Role = {
        id: 'viewer',
        name: 'viewer',
        description: 'Document viewer',
        permissions: [scopedPermission]
      };

      const scopedUser: AuthUser = {
        id: 'viewer1',
        email: 'viewer@example.com',
        roles: [scopedRole]
      };

      expect(rbacManager.hasPermission(scopedUser, 'documents', 'read', 'public')).toBe(true);
      expect(rbacManager.hasPermission(scopedUser, 'documents', 'read', 'private')).toBe(false);
      expect(rbacManager.hasPermission(scopedUser, 'documents', 'read')).toBe(false);
    });

    it('should handle wildcard scope', () => {
      expect(rbacManager.hasPermission(adminUser, 'documents', 'read', 'public')).toBe(true);
      expect(rbacManager.hasPermission(adminUser, 'documents', 'read', 'private')).toBe(true);
      expect(rbacManager.hasPermission(adminUser, 'documents', 'read', 'anything')).toBe(true);
    });
  });

  describe('Role Checking', () => {
    const userRole: Role = {
      id: 'user',
      name: 'user',
      description: 'Standard user',
      permissions: []
    };

    const adminRole: Role = {
      id: 'admin',
      name: 'admin',
      description: 'Administrator',
      permissions: []
    };

    const multiRoleUser: AuthUser = {
      id: 'multi1',
      email: 'multi@example.com',
      roles: [userRole, adminRole]
    };

    const singleRoleUser: AuthUser = {
      id: 'single1',
      email: 'single@example.com',
      roles: [userRole]
    };

    it('should check if user has any of specified roles', () => {
      expect(rbacManager.hasAnyRole(multiRoleUser, ['user'])).toBe(true);
      expect(rbacManager.hasAnyRole(multiRoleUser, ['admin'])).toBe(true);
      expect(rbacManager.hasAnyRole(multiRoleUser, ['user', 'admin'])).toBe(true);
      expect(rbacManager.hasAnyRole(multiRoleUser, ['moderator'])).toBe(false);
      
      expect(rbacManager.hasAnyRole(singleRoleUser, ['user'])).toBe(true);
      expect(rbacManager.hasAnyRole(singleRoleUser, ['admin'])).toBe(false);
      expect(rbacManager.hasAnyRole(singleRoleUser, ['user', 'admin'])).toBe(true);
    });

    it('should check if user has all specified roles', () => {
      expect(rbacManager.hasAllRoles(multiRoleUser, ['user'])).toBe(true);
      expect(rbacManager.hasAllRoles(multiRoleUser, ['admin'])).toBe(true);
      expect(rbacManager.hasAllRoles(multiRoleUser, ['user', 'admin'])).toBe(true);
      expect(rbacManager.hasAllRoles(multiRoleUser, ['user', 'admin', 'moderator'])).toBe(false);
      
      expect(rbacManager.hasAllRoles(singleRoleUser, ['user'])).toBe(true);
      expect(rbacManager.hasAllRoles(singleRoleUser, ['admin'])).toBe(false);
      expect(rbacManager.hasAllRoles(singleRoleUser, ['user', 'admin'])).toBe(false);
    });
  });

  describe('User Permissions', () => {
    const readDocsPermission: Permission = {
      id: 'read:documents',
      resource: 'documents',
      action: 'read'
    };

    const writeDocsPermission: Permission = {
      id: 'write:documents',
      resource: 'documents',
      action: 'write'
    };

    const readUsersPermission: Permission = {
      id: 'read:users',
      resource: 'users',
      action: 'read'
    };

    const userRole: Role = {
      id: 'user',
      name: 'user',
      description: 'Standard user',
      permissions: [readDocsPermission]
    };

    const editorRole: Role = {
      id: 'editor',
      name: 'editor',
      description: 'Editor',
      permissions: [writeDocsPermission, readUsersPermission]
    };

    const multiRoleUser: AuthUser = {
      id: 'multi1',
      email: 'multi@example.com',
      roles: [userRole, editorRole]
    };

    it('should get all unique permissions for user', () => {
      const permissions = rbacManager.getUserPermissions(multiRoleUser);
      
      expect(permissions).toHaveLength(3);
      expect(permissions).toContainEqual(readDocsPermission);
      expect(permissions).toContainEqual(writeDocsPermission);
      expect(permissions).toContainEqual(readUsersPermission);
    });

    it('should handle duplicate permissions across roles', () => {
      const duplicateRole: Role = {
        id: 'duplicate',
        name: 'duplicate',
        description: 'Duplicate permissions',
        permissions: [readDocsPermission] // Same as userRole
      };

      const userWithDuplicates: AuthUser = {
        id: 'dup1',
        email: 'dup@example.com',
        roles: [userRole, duplicateRole]
      };

      const permissions = rbacManager.getUserPermissions(userWithDuplicates);
      expect(permissions).toHaveLength(1);
      expect(permissions).toContainEqual(readDocsPermission);
    });

    it('should return empty array for user with no roles', () => {
      const noRoleUser: AuthUser = {
        id: 'none1',
        email: 'none@example.com',
        roles: []
      };

      const permissions = rbacManager.getUserPermissions(noRoleUser);
      expect(permissions).toHaveLength(0);
    });
  });

  describe('Default Initialization', () => {
    it('should initialize default roles and permissions', () => {
      rbacManager.initializeDefaults();
      
      // Check default permissions exist
      expect(rbacManager.getPermission('read:documents')).toBeDefined();
      expect(rbacManager.getPermission('write:documents')).toBeDefined();
      expect(rbacManager.getPermission('admin:all')).toBeDefined();
      
      // Check default roles exist
      expect(rbacManager.getRole('guest')).toBeDefined();
      expect(rbacManager.getRole('user')).toBeDefined();
      expect(rbacManager.getRole('moderator')).toBeDefined();
      expect(rbacManager.getRole('admin')).toBeDefined();
      
      // Check role permissions
      const guestRole = rbacManager.getRole('guest');
      expect(guestRole?.permissions).toHaveLength(1);
      
      const adminRole = rbacManager.getRole('admin');
      expect(adminRole?.permissions).toHaveLength(1);
      expect(adminRole?.permissions[0].id).toBe('admin:all');
    });

    it('should create functional permission hierarchy', () => {
      rbacManager.initializeDefaults();
      
      const guestRole = rbacManager.getRole('guest')!;
      const userRole = rbacManager.getRole('user')!;
      const moderatorRole = rbacManager.getRole('moderator')!;
      const adminRole = rbacManager.getRole('admin')!;

      const guest: AuthUser = { id: '1', email: 'guest@test.com', roles: [guestRole] };
      const user: AuthUser = { id: '2', email: 'user@test.com', roles: [userRole] };
      const moderator: AuthUser = { id: '3', email: 'mod@test.com', roles: [moderatorRole] };
      const admin: AuthUser = { id: '4', email: 'admin@test.com', roles: [adminRole] };

      // Guest can only read documents
      expect(rbacManager.hasPermission(guest, 'documents', 'read')).toBe(true);
      expect(rbacManager.hasPermission(guest, 'documents', 'write')).toBe(false);

      // User can read and write documents, read users
      expect(rbacManager.hasPermission(user, 'documents', 'read')).toBe(true);
      expect(rbacManager.hasPermission(user, 'documents', 'write')).toBe(true);
      expect(rbacManager.hasPermission(user, 'users', 'read')).toBe(true);
      expect(rbacManager.hasPermission(user, 'users', 'write')).toBe(false);

      // Moderator has more permissions
      expect(rbacManager.hasPermission(moderator, 'documents', 'delete')).toBe(true);
      expect(rbacManager.hasPermission(moderator, 'users', 'write')).toBe(true);

      // Admin has all permissions
      expect(rbacManager.hasPermission(admin, 'anything', 'anything')).toBe(true);
    });
  });
});