'use client';

/**
 * Admin Security Management Page
 * Demonstrates the enhanced security features
 */

import { useState, useEffect } from 'react';
import { useSecurity } from '../components/SecurityProvider';
import { PermissionGate } from '../components/PermissionGate';
import { useAuditLogger } from '../components/AuditLogger';

interface AuditLogEntry {
  id: string;
  action_type: string;
  username: string;
  timestamp: number;
  ip_address: string;
  target_resource?: string;
  target_id?: string;
  success: boolean;
  error_message?: string;
}

export default function AdminSecurityPage() {
  const { user, isAuthenticated, hasPermission } = useSecurity();
  const { logPageView, logSystemAction } = useAuditLogger();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      logPageView('security_management');
      fetchAuditLogs();
    }
  }, [isAuthenticated, logPageView]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/audit-log?limit=50');
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
      } else {
        setError('Failed to fetch audit logs');
      }
    } catch (err) {
      setError('Network error fetching audit logs');
    } finally {
      setLoading(false);
    }
  };

  const testAuditLogging = async () => {
    await logSystemAction('security_test', true, {
      testType: 'manual_audit_test',
      description: 'Testing audit logging functionality'
    });
    
    // Refresh logs to show the new entry
    setTimeout(fetchAuditLogs, 1000);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

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

        {/* User Information */}
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
              <div style={{ fontWeight: '500' }}>{user?.username}</div>
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '14px' }}>Role</div>
              <div style={{ fontWeight: '500', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '14px' }}>Permissions</div>
              <div style={{ fontWeight: '500' }}>{user?.permissions?.join(', ')}</div>
            </div>
          </div>
        </div>

        {/* Permission Demonstration */}
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
          
          <div style={{ display: 'grid', gap: '12px' }}>
            <PermissionGate category="analytics_view" showReason>
              <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', color: '#4ade80' }}>
                ✅ You have access to Analytics View
              </div>
            </PermissionGate>
            
            <PermissionGate category="system_settings" level="admin" showReason>
              <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', color: '#4ade80' }}>
                ✅ You have access to System Settings (Admin Level)
              </div>
            </PermissionGate>
            
            <PermissionGate category="user_management" level="write" showReason>
              <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', color: '#4ade80' }}>
                ✅ You have access to User Management (Write Level)
              </div>
            </PermissionGate>
          </div>
        </div>

        {/* Audit Logging */}
        <PermissionGate category="audit_logs" level="read">
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
              
              <button
                onClick={testAuditLogging}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #7877c6 0%, #ff77c6 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Test Audit Logging
              </button>
            </div>
            
            {loading ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                Loading audit logs...
              </div>
            ) : error ? (
              <div style={{ color: '#fca5a5', textAlign: 'center', padding: '20px' }}>
                {error}
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
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
                          padding: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          fontSize: '14px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '500', color: log.success ? '#4ade80' : '#fca5a5' }}>
                            {log.action_type}
                          </span>
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                        
                        <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                          User: {log.username} | IP: {log.ip_address}
                          {log.target_resource && ` | Target: ${log.target_resource}`}
                          {log.target_id && `/${log.target_id}`}
                        </div>
                        
                        {log.error_message && (
                          <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '4px' }}>
                            Error: {log.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </PermissionGate>
      </div>
    </div>
  );
}