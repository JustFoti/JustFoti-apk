/**
 * Enhanced Admin Authentication Middleware
 * Provides comprehensive authentication, authorization, and audit logging
 */

import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { initializeDB, getDB } from '@/lib/db/neon-connection';

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
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const ADMIN_COOKIE = 'admin_token';

// Role and permission hierarchies
const ROLE_HIERARCHY: Record<AdminRole, number> = {
  'viewer': 1,
  'analyst': 2,
  'moderator': 3,
  'administrator': 4,
  'super_admin': 5
};

const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  'read': 1,
  'write': 2,
  'admin': 3,
  'super_admin': 4
};

// Default permissions by role
const DEFAULT_ROLE_PERMISSIONS: Record<AdminRole, {
  permissions: PermissionLevel[];
  specificPermissions: FunctionalityCategory[];
}> = {
  'viewer': {
    permissions: ['read'],
    specificPermissions: ['analytics_view']
  },
  'analyst': {
    permissions: ['read', 'write'],
    specificPermissions: ['analytics_view', 'analytics_export', 'user_data_access']
  },
  'moderator': {
    permissions: ['read', 'write'],
    specificPermissions: ['analytics_view', 'analytics_export', 'user_management', 'content_moderation', 'bot_detection']
  },
  'administrator': {
    permissions: ['read', 'write', 'admin'],
    specificPermissions: [
      'analytics_view', 'analytics_export', 'user_management', 'content_moderation',
      'system_settings', 'user_data_access', 'audit_logs', 'bot_detection', 'system_health'
    ]
  },
  'super_admin': {
    permissions: ['read', 'write', 'admin', 'super_admin'],
    specificPermissions: [
      'analytics_view', 'analytics_export', 'user_management', 'content_moderation',
      'system_settings', 'user_data_access', 'audit_logs', 'bot_detection', 'system_health'
    ]
  }
};

/**
 * Enhanced Authentication Service
 */
export class AdminAuthService {
  /**
   * Authenticate admin user from request
   */
  static async authenticateRequest(request: NextRequest): Promise<AuthResult> {
    try {
      // Get token from cookie
      const token = request.cookies.get(ADMIN_COOKIE)?.value;
      
      if (!token) {
        return {
          success: false,
          error: 'Authentication required',
          shouldRedirect: true
        };
      }

      // Verify JWT token
      let decoded: { id: string; username: string };
      try {
        decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
      } catch (jwtError) {
        return {
          success: false,
          error: 'Invalid or expired token',
          shouldRedirect: true
        };
      }

      // Get user from database
      await initializeDB();
      const db = getDB();
      const adapter = db.getAdapter();
      
      let user;
      if (db.isUsingNeon()) {
        const result = await adapter.query(
          'SELECT * FROM admin_users WHERE id = $1',
          [decoded.id]
        );
        user = result[0];
      } else {
        const result = await adapter.query(
          'SELECT * FROM admin_users WHERE id = ?',
          [decoded.id]
        );
        user = result[0];
      }
      
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          shouldRedirect: true
        };
      }

      // Build admin user object with permissions
      const adminUser: AdminUser = {
        id: user.id,
        username: user.username,
        role: (user.role || 'viewer') as AdminRole,
        permissions: DEFAULT_ROLE_PERMISSIONS[user.role as AdminRole]?.permissions || ['read'],
        specificPermissions: DEFAULT_ROLE_PERMISSIONS[user.role as AdminRole]?.specificPermissions || ['analytics_view'],
        lastLogin: user.last_login || 0,
        createdAt: user.created_at || 0
      };

      return {
        success: true,
        user: adminUser
      };

    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed',
        shouldRedirect: true
      };
    }
  }

  /**
   * Check if user has required permissions for functionality
   */
  static checkPermissions(
    user: AdminUser,
    requiredCategory: FunctionalityCategory,
    requiredPermission: PermissionLevel = 'read',
    requiredRole?: AdminRole
  ): PermissionCheck {
    // Check specific functionality permission
    if (!user.specificPermissions.includes(requiredCategory)) {
      return {
        allowed: false,
        reason: `Missing specific permission for ${requiredCategory}`,
        requiredPermission
      };
    }

    // Check role hierarchy if required
    if (requiredRole) {
      const userRoleLevel = ROLE_HIERARCHY[user.role];
      const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];
      
      if (userRoleLevel < requiredRoleLevel) {
        return {
          allowed: false,
          reason: `Insufficient role level. Required: ${requiredRole}, User: ${user.role}`,
          requiredRole
        };
      }
    }

    // Check permission level
    const hasRequiredPermission = user.permissions.some(permission => {
      const userPermissionLevel = PERMISSION_HIERARCHY[permission];
      const requiredPermissionLevel = PERMISSION_HIERARCHY[requiredPermission];
      return userPermissionLevel >= requiredPermissionLevel;
    });

    if (!hasRequiredPermission) {
      return {
        allowed: false,
        reason: `Insufficient permission level. Required: ${requiredPermission}`,
        requiredPermission
      };
    }

    return { allowed: true };
  }

  /**
   * Get user's permission scope
   */
  static getUserPermissionScope(user: AdminUser): {
    role: AdminRole;
    permissions: PermissionLevel[];
    specificPermissions: FunctionalityCategory[];
    canAccess: (category: FunctionalityCategory, level?: PermissionLevel) => boolean;
  } {
    return {
      role: user.role,
      permissions: user.permissions,
      specificPermissions: user.specificPermissions,
      canAccess: (category: FunctionalityCategory, level: PermissionLevel = 'read') => {
        return this.checkPermissions(user, category, level).allowed;
      }
    };
  }
}

/**
 * Audit Logging Service
 */
export interface AuditLogEntry {
  id: string;
  actionType: string;
  userId: string;
  username: string;
  timestamp: number;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  targetResource?: string;
  targetId?: string;
  actionDetails: Record<string, any>;
  success: boolean;
  errorMessage?: string;
  duration?: number;
}

export class AuditLogService {
  /**
   * Log administrative action
   */
  static async logAction(
    user: AdminUser,
    actionType: string,
    request: NextRequest,
    details: Record<string, any> = {},
    success: boolean = true,
    errorMessage?: string,
    targetResource?: string,
    targetId?: string,
    duration?: number
  ): Promise<void> {
    try {
      await initializeDB();
      const db = getDB();
      const adapter = db.getAdapter();

      const logEntry: Omit<AuditLogEntry, 'id'> = {
        actionType,
        userId: user.id,
        username: user.username,
        timestamp: Date.now(),
        ipAddress: this.getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'Unknown',
        sessionId: this.getSessionId(request),
        targetResource,
        targetId,
        actionDetails: details,
        success,
        errorMessage,
        duration
      };

      if (db.isUsingNeon()) {
        await adapter.execute(`
          INSERT INTO audit_logs (
            action_type, user_id, username, timestamp, ip_address, user_agent,
            session_id, target_resource, target_id, action_details, success,
            error_message, duration
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          logEntry.actionType, logEntry.userId, logEntry.username, logEntry.timestamp,
          logEntry.ipAddress, logEntry.userAgent, logEntry.sessionId,
          logEntry.targetResource, logEntry.targetId, JSON.stringify(logEntry.actionDetails),
          logEntry.success, logEntry.errorMessage, logEntry.duration
        ]);
      } else {
        await adapter.execute(`
          INSERT INTO audit_logs (
            action_type, user_id, username, timestamp, ip_address, user_agent,
            session_id, target_resource, target_id, action_details, success,
            error_message, duration
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          logEntry.actionType, logEntry.userId, logEntry.username, logEntry.timestamp,
          logEntry.ipAddress, logEntry.userAgent, logEntry.sessionId,
          logEntry.targetResource, logEntry.targetId, JSON.stringify(logEntry.actionDetails),
          logEntry.success, logEntry.errorMessage, logEntry.duration
        ]);
      }
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      // Don't throw - audit logging failure shouldn't break the main functionality
    }
  }

  /**
   * Get client IP address
   */
  private static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const remoteAddr = request.headers.get('remote-addr');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return realIP || remoteAddr || 'unknown';
  }

  /**
   * Get session ID from request
   */
  private static getSessionId(request: NextRequest): string {
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    if (token) {
      try {
        const decoded = jwt.decode(token) as any;
        return decoded?.jti || `session_${Date.now()}`;
      } catch {
        return `session_${Date.now()}`;
      }
    }
    return `session_${Date.now()}`;
  }
}

/**
 * Data Protection Service
 */
export class DataProtectionService {
  /**
   * Sanitize sensitive data for logging/export
   */
  static sanitizeData(data: any, sensitiveFields: string[] = []): any {
    const defaultSensitiveFields = [
      'password', 'password_hash', 'token', 'secret', 'key',
      'email', 'phone', 'ssn', 'credit_card', 'ip_address'
    ];
    
    const allSensitiveFields = [...defaultSensitiveFields, ...sensitiveFields];
    
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item, sensitiveFields));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      const isSensitive = allSensitiveFields.some(field => keyLower.includes(field));
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeData(value, sensitiveFields);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Mask sensitive string data
   */
  static maskString(str: string, visibleChars: number = 4): string {
    if (!str || str.length <= visibleChars) {
      return '*'.repeat(str?.length || 0);
    }
    
    const visible = str.slice(-visibleChars);
    const masked = '*'.repeat(str.length - visibleChars);
    return masked + visible;
  }
}