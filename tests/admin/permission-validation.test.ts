/**
 * Property-Based Test: Permission Validation
 * Feature: admin-panel-unified-refactor, Property 39: Permission validation
 * Validates: Requirements 9.2
 * 
 * Property: For any admin user with specific permission levels,
 * the system should only allow access to functionality within their authorized scope
 */

import * as fc from 'fast-check';

// Permission levels and roles
type PermissionLevel = 'read' | 'write' | 'admin' | 'super_admin';
type AdminRole = 'viewer' | 'analyst' | 'moderator' | 'administrator' | 'super_admin';

// Admin functionality categories
type FunctionalityCategory = 
  | 'analytics_view' 
  | 'analytics_export' 
  | 'user_management' 
  | 'content_moderation' 
  | 'system_settings' 
  | 'user_data_access'
  | 'audit_logs'
  | 'bot_detection'
  | 'system_health';

// Admin user with permissions
interface AdminUser {
  id: string;
  username: string;
  role: AdminRole;
  permissions: PermissionLevel[];
  specificPermissions: FunctionalityCategory[];
}

// Admin functionality definition
interface AdminFunctionality {
  category: FunctionalityCategory;
  requiredPermission: PermissionLevel;
  requiredRole?: AdminRole;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

// Permission validation result
interface ValidationResult {
  allowed: boolean;
  reason?: string;
  requiredPermission?: PermissionLevel;
  requiredRole?: AdminRole;
}

// Permission validation system
class PermissionValidator {
  private static readonly ROLE_HIERARCHY: Record<AdminRole, number> = {
    'viewer': 1,
    'analyst': 2,
    'moderator': 3,
    'administrator': 4,
    'super_admin': 5
  };

  private static readonly PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
    'read': 1,
    'write': 2,
    'admin': 3,
    'super_admin': 4
  };

  static validateAccess(user: AdminUser, functionality: AdminFunctionality): ValidationResult {
    // Check if user has specific permission for this functionality category
    if (!user.specificPermissions.includes(functionality.category)) {
      return {
        allowed: false,
        reason: `Missing specific permission for ${functionality.category}`,
        requiredPermission: functionality.requiredPermission
      };
    }

    // Check role hierarchy if required role is specified
    if (functionality.requiredRole) {
      const userRoleLevel = this.ROLE_HIERARCHY[user.role];
      const requiredRoleLevel = this.ROLE_HIERARCHY[functionality.requiredRole];
      
      if (userRoleLevel < requiredRoleLevel) {
        return {
          allowed: false,
          reason: `Insufficient role level. Required: ${functionality.requiredRole}, User: ${user.role}`,
          requiredRole: functionality.requiredRole
        };
      }
    }

    // Check permission level
    const hasRequiredPermission = user.permissions.some(permission => {
      const userPermissionLevel = this.PERMISSION_HIERARCHY[permission];
      const requiredPermissionLevel = this.PERMISSION_HIERARCHY[functionality.requiredPermission];
      return userPermissionLevel >= requiredPermissionLevel;
    });

    if (!hasRequiredPermission) {
      return {
        allowed: false,
        reason: `Insufficient permission level. Required: ${functionality.requiredPermission}`,
        requiredPermission: functionality.requiredPermission
      };
    }

    // All checks passed
    return { allowed: true };
  }

  static getUserPermissionScope(user: AdminUser): FunctionalityCategory[] {
    // Return the categories the user has explicit permissions for
    return user.specificPermissions;
  }
}

// Generators for property-based testing
const generateAdminRole = (): fc.Arbitrary<AdminRole> => 
  fc.constantFrom('viewer', 'analyst', 'moderator', 'administrator', 'super_admin');

const generatePermissionLevel = (): fc.Arbitrary<PermissionLevel> => 
  fc.constantFrom('read', 'write', 'admin', 'super_admin');

const generateFunctionalityCategory = (): fc.Arbitrary<FunctionalityCategory> => 
  fc.constantFrom(
    'analytics_view', 'analytics_export', 'user_management', 'content_moderation',
    'system_settings', 'user_data_access', 'audit_logs', 'bot_detection', 'system_health'
  );

const generateAdminUser = (): fc.Arbitrary<AdminUser> => fc.record({
  id: fc.string({ minLength: 5, maxLength: 20 }),
  username: fc.string({ minLength: 3, maxLength: 20 }),
  role: generateAdminRole(),
  permissions: fc.array(generatePermissionLevel(), { minLength: 1, maxLength: 4 }).map(perms => 
    [...new Set(perms)] // Remove duplicates
  ),
  specificPermissions: fc.array(generateFunctionalityCategory(), { minLength: 0, maxLength: 9 }).map(perms => 
    [...new Set(perms)] // Remove duplicates
  )
});

const generateAdminFunctionality = (): fc.Arbitrary<AdminFunctionality> => fc.record({
  category: generateFunctionalityCategory(),
  requiredPermission: generatePermissionLevel(),
  requiredRole: fc.option(generateAdminRole(), { nil: undefined }),
  endpoint: fc.constantFrom(
    '/api/admin/analytics', '/api/admin/users', '/api/admin/export',
    '/api/admin/system-health', '/api/admin/bot-detection', '/api/admin/audit-logs'
  ),
  method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE')
});

describe('Permission Validation Property Tests', () => {
  describe('Property 39: Permission validation', () => {
    test('should only allow access to functionality within authorized scope', () => {
      fc.assert(
        fc.property(
          generateAdminUser(),
          generateAdminFunctionality(),
          (user, functionality) => {
            const result = PermissionValidator.validateAccess(user, functionality);
            
            // Check if user should have access based on their permissions
            const hasSpecificPermission = user.specificPermissions.includes(functionality.category);
            const hasRequiredPermissionLevel = user.permissions.some(permission => {
              const userLevel = PermissionValidator['PERMISSION_HIERARCHY'][permission];
              const requiredLevel = PermissionValidator['PERMISSION_HIERARCHY'][functionality.requiredPermission];
              return userLevel >= requiredLevel;
            });
            
            let hasRequiredRole = true;
            if (functionality.requiredRole) {
              const userRoleLevel = PermissionValidator['ROLE_HIERARCHY'][user.role];
              const requiredRoleLevel = PermissionValidator['ROLE_HIERARCHY'][functionality.requiredRole];
              hasRequiredRole = userRoleLevel >= requiredRoleLevel;
            }

            const shouldHaveAccess = hasSpecificPermission && hasRequiredPermissionLevel && hasRequiredRole;

            if (shouldHaveAccess) {
              expect(result.allowed).toBe(true);
              expect(result.reason).toBeUndefined();
            } else {
              expect(result.allowed).toBe(false);
              expect(result.reason).toBeDefined();
              expect(typeof result.reason).toBe('string');
              expect(result.reason!.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should deny access when user lacks specific functionality permission', () => {
      fc.assert(
        fc.property(
          generateAdminUser(),
          generateFunctionalityCategory(),
          (user, restrictedCategory) => {
            // Ensure user doesn't have permission for this category
            const userWithoutPermission: AdminUser = {
              ...user,
              specificPermissions: user.specificPermissions.filter(p => p !== restrictedCategory)
            };

            const functionality: AdminFunctionality = {
              category: restrictedCategory,
              requiredPermission: 'read',
              endpoint: '/api/admin/test',
              method: 'GET'
            };

            const result = PermissionValidator.validateAccess(userWithoutPermission, functionality);
            
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain(`Missing specific permission for ${restrictedCategory}`);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should deny access when user has insufficient permission level', () => {
      fc.assert(
        fc.property(
          generateFunctionalityCategory(),
          (category) => {
            // Create user with only read permission
            const userWithLowPermission: AdminUser = {
              id: 'test-user',
              username: 'testuser',
              role: 'viewer',
              permissions: ['read'],
              specificPermissions: [category] // Has specific permission but low level
            };

            // Create functionality requiring admin permission
            const highPermissionFunctionality: AdminFunctionality = {
              category,
              requiredPermission: 'admin',
              endpoint: '/api/admin/test',
              method: 'POST'
            };

            const result = PermissionValidator.validateAccess(userWithLowPermission, highPermissionFunctionality);
            
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Insufficient permission level');
            expect(result.requiredPermission).toBe('admin');
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should deny access when user has insufficient role level', () => {
      fc.assert(
        fc.property(
          generateFunctionalityCategory(),
          (category) => {
            // Create user with low role
            const userWithLowRole: AdminUser = {
              id: 'test-user',
              username: 'testuser',
              role: 'viewer',
              permissions: ['admin'], // Has permission level but low role
              specificPermissions: [category]
            };

            // Create functionality requiring high role
            const highRoleFunctionality: AdminFunctionality = {
              category,
              requiredPermission: 'read',
              requiredRole: 'administrator',
              endpoint: '/api/admin/test',
              method: 'GET'
            };

            const result = PermissionValidator.validateAccess(userWithLowRole, highRoleFunctionality);
            
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Insufficient role level');
            expect(result.requiredRole).toBe('administrator');
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should allow access when user meets all requirements', () => {
      fc.assert(
        fc.property(
          generateFunctionalityCategory(),
          (category) => {
            // Create user with sufficient permissions
            const authorizedUser: AdminUser = {
              id: 'admin-user',
              username: 'adminuser',
              role: 'administrator',
              permissions: ['admin', 'write', 'read'],
              specificPermissions: [category]
            };

            // Create functionality with moderate requirements
            const functionality: AdminFunctionality = {
              category,
              requiredPermission: 'write',
              requiredRole: 'analyst',
              endpoint: '/api/admin/test',
              method: 'POST'
            };

            const result = PermissionValidator.validateAccess(authorizedUser, functionality);
            
            expect(result.allowed).toBe(true);
            expect(result.reason).toBeUndefined();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Permission Scope Tests', () => {
    test('should return correct permission scope for user', () => {
      fc.assert(
        fc.property(generateAdminUser(), (user) => {
          const scope = PermissionValidator.getUserPermissionScope(user);
          
          expect(Array.isArray(scope)).toBe(true);
          expect(scope).toEqual(user.specificPermissions);
          
          // Should not contain duplicates
          const uniqueScope = [...new Set(scope)];
          expect(scope.length).toBe(uniqueScope.length);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle user with no permissions', () => {
      const userWithNoPermissions: AdminUser = {
        id: 'no-perm-user',
        username: 'nopermuser',
        role: 'viewer',
        permissions: [],
        specificPermissions: []
      };

      const functionality: AdminFunctionality = {
        category: 'analytics_view',
        requiredPermission: 'read',
        endpoint: '/api/admin/analytics',
        method: 'GET'
      };

      const result = PermissionValidator.validateAccess(userWithNoPermissions, functionality);
      
      expect(result.allowed).toBe(false);
    });

    test('should handle super admin with all permissions', () => {
      const superAdmin: AdminUser = {
        id: 'super-admin',
        username: 'superadmin',
        role: 'super_admin',
        permissions: ['super_admin'],
        specificPermissions: [
          'analytics_view', 'analytics_export', 'user_management', 'content_moderation',
          'system_settings', 'user_data_access', 'audit_logs', 'bot_detection', 'system_health'
        ]
      };

      fc.assert(
        fc.property(generateAdminFunctionality(), (functionality) => {
          const result = PermissionValidator.validateAccess(superAdmin, functionality);
          expect(result.allowed).toBe(true);
        }),
        { numRuns: 30 }
      );
    });
  });
});