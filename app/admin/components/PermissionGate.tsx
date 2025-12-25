'use client';

/**
 * Permission Gate Component
 * Conditionally renders content based on user permissions
 */

import React, { ReactNode } from 'react';
import { useSecurity } from './SecurityProvider';
import { FunctionalityCategory, PermissionLevel } from '../middleware/auth';

interface PermissionGateProps {
  children: ReactNode;
  category: FunctionalityCategory;
  level?: PermissionLevel;
  fallback?: ReactNode;
  showReason?: boolean;
}

export function PermissionGate({ 
  children, 
  category, 
  level = 'read', 
  fallback = null,
  showReason = false 
}: PermissionGateProps) {
  const { hasPermission, checkAccess, loading } = useSecurity();

  if (loading) {
    return (
      <div style={{
        padding: '12px',
        background: 'rgba(120, 119, 198, 0.1)',
        borderRadius: '8px',
        color: '#94a3b8',
        fontSize: '14px'
      }}>
        Checking permissions...
      </div>
    );
  }

  const allowed = hasPermission(category, level);

  if (allowed) {
    return <>{children}</>;
  }

  if (showReason) {
    const accessCheck = checkAccess(category, level);
    return (
      <div style={{
        padding: '16px',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '8px',
        color: '#fca5a5',
        fontSize: '14px'
      }}>
        <div style={{ fontWeight: '500', marginBottom: '4px' }}>
          Access Denied
        </div>
        <div style={{ fontSize: '13px', opacity: 0.9 }}>
          {accessCheck.reason || 'Insufficient permissions'}
        </div>
      </div>
    );
  }

  return <>{fallback}</>;
}

/**
 * Higher-order component for permission-based rendering
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  category: FunctionalityCategory,
  level: PermissionLevel = 'read',
  fallback?: ReactNode
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGate category={category} level={level} fallback={fallback}>
        <Component {...props} />
      </PermissionGate>
    );
  };
}

/**
 * Hook for conditional permission-based logic
 */
export function usePermissionCheck(category: FunctionalityCategory, level: PermissionLevel = 'read') {
  const { hasPermission, checkAccess } = useSecurity();
  
  return {
    allowed: hasPermission(category, level),
    check: checkAccess(category, level)
  };
}