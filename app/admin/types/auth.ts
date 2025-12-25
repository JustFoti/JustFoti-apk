/**
 * Admin Authentication Types
 * Client-safe types and utilities for admin authentication
 */

// Types
export interface AdminUser {
  id: string;
  username: string;
  role: AdminRole;
  permissions: PermissionLevel[];
  specificPermissions: FunctionalityCategory[];
  lastLogin: number;
  createdAt: number;
}

export type AdminRole = 'viewer' | 'analyst' | 'moderator' | 'administrator' | 'super_admin';
export type PermissionLevel = 'read' | 'write' | 'admin' | 'super_admin';
export type FunctionalityCategory = 
  | 'analytics_view' | 'analytics_export' | 'user_management' | 'content_moderation'
  | 'system_settings' | 'user_data_access' | 'audit_logs' | 'bot_detection' | 'system_health';

export interface AuthResult {
  success: boolean;
  user?: AdminUser;
  error?: string;
  shouldRedirect?: boolean;
}

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  requiredPermission?: PermissionLevel;
  requiredRole?: AdminRole;
}

// Constants
export const ADMIN_COOKIE = 'admin_token';

// Role and permission hierarchies
export const ROLE_HIERARCHY: Record<AdminRole, number> = {
  'viewer': 1,
  'analyst': 2,
  'moderator': 3,
  'administrator': 4,
  'super_admin': 5
};

export const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  'read': 1,
  'write': 2,
  'admin': 3,
  'super_admin': 4
};

// Role-based default permissions
export const ROLE_PERMISSIONS: Record<AdminRole, FunctionalityCategory[]> = {
  'viewer': ['analytics_view'],
  'analyst': ['analytics_view', 'analytics_export'],
  'moderator': ['analytics_view', 'analytics_export', 'content_moderation', 'bot_detection'],
  'administrator': [
    'analytics_view', 'analytics_export', 'content_moderation', 'bot_detection',
    'user_management', 'system_settings', 'audit_logs'
  ],
  'super_admin': [
    'analytics_view', 'analytics_export', 'content_moderation', 'bot_detection',
    'user_management', 'system_settings', 'audit_logs', 'user_data_access', 'system_health'
  ]
};

/**
 * Client-safe permission checking utilities
 */
export class ClientAuthUtils {
  /**
   * Check if user has required permission level for a functionality category
   */
  static checkPermissions(
    user: AdminUser,
    category: FunctionalityCategory,
    requiredLevel: PermissionLevel = 'read'
  ): PermissionCheck {
    if (!user) {
      return {
        allowed: false,
        reason: 'User not authenticated',
        requiredPermission: requiredLevel
      };
    }

    // Super admin has all permissions
    if (user.role === 'super_admin') {
      return { allowed: true };
    }

    // Check if user has specific permission for this category
    const hasSpecificPermission = user.specificPermissions.includes(category);
    const hasRolePermission = ROLE_PERMISSIONS[user.role]?.includes(category);

    if (!hasSpecificPermission && !hasRolePermission) {
      return {
        allowed: false,
        reason: `Missing permission for ${category}`,
        requiredPermission: requiredLevel
      };
    }

    // Check permission level
    const userMaxLevel = Math.max(
      ...user.permissions.map(p => PERMISSION_HIERARCHY[p])
    );
    const requiredLevelValue = PERMISSION_HIERARCHY[requiredLevel];

    if (userMaxLevel < requiredLevelValue) {
      return {
        allowed: false,
        reason: `Insufficient permission level. Required: ${requiredLevel}`,
        requiredPermission: requiredLevel
      };
    }

    return { allowed: true };
  }

  /**
   * Get user's permission scope for display purposes
   */
  static getUserPermissionScope(user: AdminUser): {
    role: AdminRole;
    permissions: PermissionLevel[];
    categories: FunctionalityCategory[];
    isAdmin: boolean;
    isSuperAdmin: boolean;
  } {
    return {
      role: user.role,
      permissions: user.permissions,
      categories: [...new Set([
        ...ROLE_PERMISSIONS[user.role] || [],
        ...user.specificPermissions
      ])],
      isAdmin: ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY['administrator'],
      isSuperAdmin: user.role === 'super_admin'
    };
  }

  /**
   * Check if user has admin-level access
   */
  static isAdmin(user: AdminUser): boolean {
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY['administrator'];
  }

  /**
   * Check if user has super admin access
   */
  static isSuperAdmin(user: AdminUser): boolean {
    return user.role === 'super_admin';
  }
}