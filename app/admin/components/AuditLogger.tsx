'use client';

/**
 * Audit Logger Hook and Components
 * Provides audit logging functionality for admin actions
 */

import { useCallback } from 'react';
import { useSecurity } from './SecurityProvider';

interface AuditLogOptions {
  targetResource?: string;
  targetId?: string;
  details?: Record<string, any>;
  duration?: number;
}

export function useAuditLogger() {
  const { user } = useSecurity();

  const logAction = useCallback(async (
    actionType: string,
    success: boolean = true,
    options: AuditLogOptions = {}
  ) => {
    if (!user) {
      console.warn('Cannot log audit action: user not authenticated');
      return;
    }

    try {
      await fetch('/api/admin/audit-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionType,
          success,
          ...options
        })
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
      // Don't throw - audit logging failure shouldn't break functionality
    }
  }, [user]);

  const logPageView = useCallback(async (pageName: string) => {
    await logAction('page_view', true, {
      targetResource: 'page',
      targetId: pageName,
      details: { page: pageName, timestamp: Date.now() }
    });
  }, [logAction]);

  const logDataExport = useCallback(async (
    exportType: string,
    recordCount: number,
    format: string,
    success: boolean = true
  ) => {
    await logAction('data_export', success, {
      targetResource: 'export',
      targetId: exportType,
      details: {
        exportType,
        recordCount,
        format,
        timestamp: Date.now()
      }
    });
  }, [logAction]);

  const logUserAction = useCallback(async (
    action: string,
    targetUserId: string,
    success: boolean = true,
    details: Record<string, any> = {}
  ) => {
    await logAction(`user_${action}`, success, {
      targetResource: 'user',
      targetId: targetUserId,
      details: {
        action,
        ...details,
        timestamp: Date.now()
      }
    });
  }, [logAction]);

  const logSystemAction = useCallback(async (
    action: string,
    success: boolean = true,
    details: Record<string, any> = {}
  ) => {
    await logAction(`system_${action}`, success, {
      targetResource: 'system',
      details: {
        action,
        ...details,
        timestamp: Date.now()
      }
    });
  }, [logAction]);

  return {
    logAction,
    logPageView,
    logDataExport,
    logUserAction,
    logSystemAction
  };
}