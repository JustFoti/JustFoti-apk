'use client';

/**
 * Admin Security Management Page
 * Demonstrates the enhanced security features with full functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { useSecurity } from '../components/SecurityProvider';
import { PermissionGate } from '../components/PermissionGate';
import { useAuditLogger } from '../components/AuditLogger';
import { ClientAuthUtils, FunctionalityCategory } from '../types/auth';

interface AuditLogEntry {
  id: string;
  action_type: string;
  user_id: string;
  username: string;
  timestamp: number;
  ip_address: string;
  target_resource?: string;
  target_id?: string;
  success: boolean;
  error_message?: string;
  action_details?: Record<string, any>;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

// All functionality categories for permission demonstration
const ALL_CATEGORIES: FunctionalityCategory[] = [
  'analytics_view', 'analytics_export', 'user_management', 'content_moderation',
  'system_settings', 'user_data_access', 'audit_logs', 'bot_detection', 'system_health'
];

export default function AdminSecurityPage() {
  const { user, isAuthenticated, checkAccess } = useSecurity();
  const { logPageView, logSystemAction } = useAuditLogger();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingAudit, setTestingAudit] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: false
  });

  const fetchAuditLogs = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      const offset = (page - 1) * pagination.pageSize;
      const response = await fetch(`/api/admin/audit-log?limit=${pagination.pageSize}&offset=${offset}`);
      if (response.ok) {
        const data = await response.json();
        const logs = data.logs || [];
        if (append) {
          setAuditLogs(prev => [...prev, ...logs]);
        } else {
          setAuditLogs(logs);
        }
        setPagination(prev => ({
          ...prev,
          page,
          total: data.pagination?.total || logs.length,
          hasMore: logs.length === pagination.pageSize
        }));
        setError(null);
      } else {
        setError('Failed to fetch audit logs');
      }
    } catch (err) {
      setError('Network error fetching audit logs');
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize]);

  useEffect(() => {
    if (isAuthenticated) {
      logPageView('security_management');
      fetchAuditLogs();
    }
  }, [isAuthenticated, logPageView, fetchAuditLogs]);

  const testAuditLogging = async () => {
    setTestingAudit(true);
    try {
      await logSystemAction('security_test', true, {
        testType: 'manual_audit_test',
        description: 'Testing audit logging functionality',
        triggeredBy: user?.username
      });
      
      // Refresh logs to show the new entry
      setTimeout(() => fetchAuditLogs(1, false), 1000);
    } finally {
      setTestingAudit(false);
    }
  };

  const loadMoreLogs = () => {
    fetchAuditLogs(pagination.page + 1, true);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get user permission scope for display
  const permissionScope = user ? ClientAuthUtils.getUserPermissionScope(user) : null;

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '20px', color: '#e2e8f0' }}>
        Please log in to access security management.
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      minHeight: '100vh',
      color: '#e2e8f0'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #7877c6 0%, #ff77c6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Security Management
        </h1>
        
        <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
          Enhanced security features and audit logging for admin panel
        </p>

        {/* User Information Section - Task 10.1 */}
        <div style={{
          background: 'rgba(15, 15, 35, 0.8)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Current User Information
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '14px' }}>Username</div>
              <div style={{ fontWeight: '500', fontSize: '16px' }}>{user?.username || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '14px' }}>Role</div>
              <div style={{ 
                fontWeight: '500', 
                textTransform: 'capitalize',
                color: permissionScope?.isSuperAdmin ? '#fbbf24' : permissionScope?.isAdmin ? '#4ade80' : '#e2e8f0'
              }}>
                {user?.role?.replace('_', ' ') || 'N/A'}
                {permissionScope?.isSuperAdmin && ' 👑'}
                {permissionScope?.isAdmin && !permissionScope?.isSuperAdmin && ' ⭐'}
              </div>
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '14px' }}>Permission Levels</div>
              <div style={{ fontWeight: '500' }}>
                {user?.permissions?.join(', ') || 'None'}
              </div>
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '14px' }}>Last Login</div>
              <div style={{ fontWeight: '500' }}>
                {user?.lastLogin ? formatTimestamp(user.lastLogin) : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '14px' }}>Account Created</div>
              <div style={{ fontWeight: '500' }}>
                {user?.createdAt ? formatTimestamp(user.createdAt) : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '14px' }}>Admin Status</div>
              <div style={{ fontWeight: '500' }}>
                {permissionScope?.isSuperAdmin ? 'Super Admin' : 
                 permissionScope?.isAdmin ? 'Administrator' : 'Standard User'}
              </div>
            </div>
          </div>
        </div>

        {/* Permission Demonstration Section - Task 10.2 */}
        <div style={{
          background: 'rgba(15, 15, 35, 0.8)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Permission-Based Access Control
          </h2>
          
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>
            Below shows which sections you can access based on your role and permissions:
          </p>
          
          <div style={{ display: 'grid', gap: '12px' }}>
            {ALL_CATEGORIES.map((category) => {
              const access = checkAccess(category, 'read');
              const writeAccess = checkAccess(category, 'write');
              const adminAccess = checkAccess(category, 'admin');
              
              return (
                <div
                  key={category}
                  style={{
                    padding: '12px 16px',
                    background: access.allowed ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '8px',
                    border: `1px solid ${access.allowed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{ 
                      color: access.allowed ? '#4ade80' : '#fca5a5',
                      fontWeight: '500'
                    }}>
                      {access.allowed ? '✅' : '❌'} {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    {!access.allowed && (
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                        {access.reason}
                      </div>
                    )}
                  </div>
                  {access.allowed && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px',
                        background: 'rgba(34, 197, 94, 0.2)',
                        color: '#4ade80'
                      }}>
                        Read
                      </span>
                      {writeAccess.allowed && (
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontSize: '11px',
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#60a5fa'
                        }}>
                          Write
                        </span>
                      )}
                      {adminAccess.allowed && (
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontSize: '11px',
                          background: 'rgba(251, 191, 36, 0.2)',
                          color: '#fbbf24'
                        }}>
                          Admin
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit Logging Section - Tasks 10.3 and 10.4 */}
        <PermissionGate category="audit_logs" level="read" showReason>
          <div style={{
            background: 'rgba(15, 15, 35, 0.8)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600' }}>
                Audit Logs
              </h2>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => fetchAuditLogs(1, false)}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  🔄 Refresh
                </button>
                
                <button
                  onClick={testAuditLogging}
                  disabled={testingAudit}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #7877c6 0%, #ff77c6 100%)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: testingAudit ? 'not-allowed' : 'pointer',
                    opacity: testingAudit ? 0.7 : 1
                  }}
                >
                  {testingAudit ? '⏳ Testing...' : '🧪 Test Audit Logging'}
                </button>
              </div>
            </div>
            
            {loading && auditLogs.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                Loading audit logs...
              </div>
            ) : error ? (
              <div style={{ color: '#fca5a5', textAlign: 'center', padding: '20px' }}>
                {error}
              </div>
            ) : (
              <>
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {auditLogs.length === 0 ? (
                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                      No audit logs found
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          style={{
                            padding: '12px 16px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            fontSize: '14px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ 
                                fontWeight: '600', 
                                color: log.success ? '#4ade80' : '#fca5a5',
                                padding: '2px 8px',
                                background: log.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '4px'
                              }}>
                                {log.action_type}
                              </span>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                background: log.success ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                color: log.success ? '#4ade80' : '#fca5a5'
                              }}>
                                {log.success ? 'Success' : 'Failed'}
                              </span>
                            </div>
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                              {formatTimestamp(log.timestamp)}
                            </span>
                          </div>
                          
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                            gap: '8px',
                            color: '#94a3b8', 
                            fontSize: '13px' 
                          }}>
                            <div>
                              <span style={{ color: '#64748b' }}>User:</span> {log.username || log.user_id}
                            </div>
                            <div>
                              <span style={{ color: '#64748b' }}>IP:</span> {log.ip_address}
                            </div>
                            {log.target_resource && (
                              <div>
                                <span style={{ color: '#64748b' }}>Target:</span> {log.target_resource}
                                {log.target_id && `/${log.target_id}`}
                              </div>
                            )}
                          </div>
                          
                          {log.error_message && (
                            <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '8px' }}>
                              Error: {log.error_message}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Pagination Controls */}
                {pagination.hasMore && (
                  <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <button
                      onClick={loadMoreLogs}
                      disabled={loading}
                      style={{
                        padding: '10px 24px',
                        background: 'rgba(120, 119, 198, 0.2)',
                        border: '1px solid rgba(120, 119, 198, 0.4)',
                        borderRadius: '6px',
                        color: '#a5b4fc',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.5 : 1
                      }}
                    >
                      {loading ? 'Loading...' : 'Load More Logs'}
                    </button>
                  </div>
                )}
                
                <div style={{ 
                  textAlign: 'center', 
                  marginTop: '12px', 
                  color: '#64748b', 
                  fontSize: '12px' 
                }}>
                  Showing {auditLogs.length} logs (Page {pagination.page})
                </div>
              </>
            )}
          </div>
        </PermissionGate>

        {/* Restricted Section Demo - Task 10.5 */}
        <div style={{
          background: 'rgba(15, 15, 35, 0.8)',
          borderRadius: '12px',
          padding: '24px',
          marginTop: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Permission-Gated Sections
          </h2>
          
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>
            The following sections demonstrate permission gates - content is hidden or shows access denied based on your permissions:
          </p>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* System Settings - Admin only */}
            <PermissionGate category="system_settings" level="admin" showReason>
              <div style={{ 
                padding: '16px', 
                background: 'rgba(251, 191, 36, 0.1)', 
                borderRadius: '8px', 
                border: '1px solid rgba(251, 191, 36, 0.3)' 
              }}>
                <h3 style={{ color: '#fbbf24', marginBottom: '8px' }}>⚙️ System Settings (Admin Only)</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                  You have admin access to system settings. This section would contain critical system configuration options.
                </p>
              </div>
            </PermissionGate>
            
            {/* User Data Access - Super Admin only */}
            <PermissionGate category="user_data_access" level="admin" showReason>
              <div style={{ 
                padding: '16px', 
                background: 'rgba(239, 68, 68, 0.1)', 
                borderRadius: '8px', 
                border: '1px solid rgba(239, 68, 68, 0.3)' 
              }}>
                <h3 style={{ color: '#f87171', marginBottom: '8px' }}>🔐 User Data Access (Super Admin Only)</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                  You have access to sensitive user data. This section would contain PII and sensitive user information.
                </p>
              </div>
            </PermissionGate>
            
            {/* System Health - Admin only */}
            <PermissionGate category="system_health" level="read" showReason>
              <div style={{ 
                padding: '16px', 
                background: 'rgba(34, 197, 94, 0.1)', 
                borderRadius: '8px', 
                border: '1px solid rgba(34, 197, 94, 0.3)' 
              }}>
                <h3 style={{ color: '#4ade80', marginBottom: '8px' }}>💚 System Health Monitoring</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                  You have access to system health monitoring. This section would show server status, database health, and performance metrics.
                </p>
              </div>
            </PermissionGate>
            
            {/* Bot Detection - Moderator+ */}
            <PermissionGate category="bot_detection" level="read" showReason>
              <div style={{ 
                padding: '16px', 
                background: 'rgba(59, 130, 246, 0.1)', 
                borderRadius: '8px', 
                border: '1px solid rgba(59, 130, 246, 0.3)' 
              }}>
                <h3 style={{ color: '#60a5fa', marginBottom: '8px' }}>🤖 Bot Detection Management</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                  You have access to bot detection features. This section would show bot detection rules and review queue.
                </p>
              </div>
            </PermissionGate>
          </div>
        </div>
      </div>
    </div>
  );
}
