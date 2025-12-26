'use client';

/**
 * Security Provider Component
 * Provides security context and authentication state management
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AdminUser, ClientAuthUtils, FunctionalityCategory, PermissionLevel } from '../types/auth';

interface SecurityContextType {
  user: AdminUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  hasPermission: (category: FunctionalityCategory, level?: PermissionLevel) => boolean;
  checkAccess: (category: FunctionalityCategory, level?: PermissionLevel) => {
    allowed: boolean;
    reason?: string;
  };
  refreshAuth: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/me');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          // Convert API response to AdminUser format
          const adminUser: AdminUser = {
            id: data.user.id,
            username: data.user.username,
            role: data.user.role || 'viewer',
            permissions: data.user.permissions || ['read'],
            specificPermissions: data.user.specificPermissions || ['analytics_view'],
            lastLogin: data.user.lastLogin || 0,
            createdAt: data.user.createdAt || 0
          };
          setUser(adminUser);
        } else {
          setUser(null);
          setError(data.error || 'Authentication failed');
        }
      } else {
        setUser(null);
        setError('Authentication required');
      }
    } catch (err) {
      setUser(null);
      setError('Network error during authentication');
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const hasPermission = (category: FunctionalityCategory, level: PermissionLevel = 'read'): boolean => {
    if (!user) return false;
    return ClientAuthUtils.checkPermissions(user, category, level).allowed;
  };

  const checkAccess = (category: FunctionalityCategory, level: PermissionLevel = 'read') => {
    if (!user) {
      return { allowed: false, reason: 'Not authenticated' };
    }
    return ClientAuthUtils.checkPermissions(user, category, level);
  };

  const contextValue: SecurityContextType = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    hasPermission,
    checkAccess,
    refreshAuth: checkAuth
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}