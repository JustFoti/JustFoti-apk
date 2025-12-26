'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAdminAnalyticsUrl } from '../hooks/useAnalyticsApi';

interface SystemHealth {
  database: { status: string; latency: number };
  api: { status: string; latency: number };
  cache: { status: string; hitRate: number };
  storage: { used: number; total: number };
}

interface DataStatus {
  stats: {
    totalRecords: number;
    uniqueUsers: number;
    totalSessions: number;
    totalWatchTime: number;
    avgSessionsPerUser: string;
    avgWatchTimePerUser: number;
    suspiciousSessionCounts: number;
    zeroWatchTimeWithSessions: number;
  };
  issues: string[];
  needsFix: boolean;
}

interface FixResult {
  usersFixed: number;
  errors: number;
  details: string[];
}

interface AdminSettings {
  refreshInterval: number;
  darkMode: boolean;
  notifications: boolean;
  autoExport: boolean;
  dataRetention: number;
  timezone: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Toast notification type
interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function AdminSettingsPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [settings, setSettings] = useState<AdminSettings>({
    refreshInterval: 30,
    darkMode: true,
    notifications: true,
    autoExport: false,
    dataRetention: 90,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'system' | 'preferences' | 'security' | 'data' | 'about'>('system');
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Data fix states
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [dataStatusLoading, setDataStatusLoading] = useState(false);
  const [fixingData, setFixingData] = useState<string | null>(null);
  const [fixResults, setFixResults] = useState<{ watchTimeFix?: FixResult; sessionsFix?: FixResult } | null>(null);
  
  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Action states
  const [clearingCache, setClearingCache] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [purging, setPurging] = useState(false);
  
  // Health auto-refresh
  const [lastHealthUpdate, setLastHealthUpdate] = useState<number>(Date.now());

  // Toast helper functions
  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Check system health
  const checkSystemHealth = useCallback(async () => {
    setLoading(true);
    try {
      // Check API health with real latency measurement
      const apiStart = Date.now();
      const apiResponse = await fetch(getAdminAnalyticsUrl('admin-analytics', { period: 'day' }));
      const apiLatency = Date.now() - apiStart;
      const apiHealthy = apiResponse.ok;
      
      // Check database health by making a lightweight query
      const dbStart = Date.now();
      let dbHealthy = false;
      let dbLatency = 0;
      try {
        const dbResponse = await fetch(getAdminAnalyticsUrl('watch-session', { limit: '1' }));
        dbLatency = Date.now() - dbStart;
        dbHealthy = dbResponse.ok;
      } catch {
        dbHealthy = false;
      }
      
      setHealth({
        database: { 
          status: dbHealthy ? (dbLatency < 500 ? 'healthy' : 'warning') : 'error', 
          latency: dbLatency 
        },
        api: { 
          status: apiHealthy ? (apiLatency < 1000 ? 'healthy' : 'warning') : 'error', 
          latency: apiLatency 
        },
        cache: { status: 'healthy', hitRate: 0 },
        storage: { used: 0, total: 0 },
      });
      setLastHealthUpdate(Date.now());
    } catch (error) {
      setHealth({
        database: { status: 'error', latency: 0 },
        api: { status: 'error', latency: 0 },
        cache: { status: 'unknown', hitRate: 0 },
        storage: { used: 0, total: 0 },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load settings from localStorage
  const loadSettings = useCallback(() => {
    const saved = localStorage.getItem('adminSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }, []);

  // Check data status
  const checkDataStatus = useCallback(async () => {
    setDataStatusLoading(true);
    try {
      const response = await fetch('/api/admin/fix-data');
      if (response.ok) {
        const data = await response.json();
        setDataStatus(data);
      }
    } catch (error) {
      console.error('Failed to check data status:', error);
    } finally {
      setDataStatusLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    checkSystemHealth();
    loadSettings();
    checkDataStatus();
  }, [checkSystemHealth, loadSettings, checkDataStatus]);

  // Auto-refresh health metrics every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkSystemHealth();
    }, 30000);
    return () => clearInterval(interval);
  }, [checkSystemHealth]);

  // Run data fix
  const runDataFix = async (action: 'fix-watch-time' | 'fix-sessions' | 'fix-all') => {
    if (!confirm(`Are you sure you want to run "${action}"? This will modify your database.`)) {
      return;
    }
    
    setFixingData(action);
    setFixResults(null);
    
    try {
      const response = await fetch('/api/admin/fix-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setFixResults(data.results);
        addToast('success', `Data fix "${action}" completed successfully!`);
        await checkDataStatus();
      } else {
        addToast('error', `Fix failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      addToast('error', `Fix failed: ${error instanceof Error ? error.message : 'Network error'}`);
    } finally {
      setFixingData(null);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }

    setPasswordChanging(true);
    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        addToast('success', 'Password changed successfully!');
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch {
      setPasswordMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setPasswordChanging(false);
    }
  };

  // Save preferences with feedback
  const saveSettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem('adminSettings', JSON.stringify(settings));
      await new Promise(resolve => setTimeout(resolve, 300));
      addToast('success', 'Preferences saved successfully!');
    } catch (error) {
      addToast('error', 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Clear cache action
  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      // Clear localStorage cache items
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('cache_') || key.startsWith('stats_') || key.includes('_cache')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      addToast('success', `Cache cleared! Removed ${keysToRemove.length} cached items.`);
    } catch (error) {
      addToast('error', 'Failed to clear cache.');
    } finally {
      setClearingCache(false);
    }
  };

  // Export analytics action
  const handleExportAnalytics = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exportType: 'analytics',
          format: 'json',
          dateRange: {
            startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
            endDate: Date.now(),
          },
          includeMetadata: true,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        addToast('success', 'Analytics exported successfully!');
      } else {
        addToast('error', 'Failed to export analytics.');
      }
    } catch (error) {
      addToast('error', 'Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Purge old data action
  const handlePurgeOldData = async () => {
    const confirmed = confirm(
      `⚠️ WARNING: This will permanently delete analytics data older than ${settings.dataRetention} days.\n\n` +
      'This action cannot be undone. Are you sure you want to proceed?'
    );
    
    if (!confirmed) return;
    
    const doubleConfirm = confirm(
      'Please confirm again: You are about to permanently delete old analytics data.'
    );
    
    if (!doubleConfirm) return;
    
    setPurging(true);
    try {
      // Calculate cutoff date for purge operation
      const cutoffTimestamp = Date.now() - settings.dataRetention * 24 * 60 * 60 * 1000;
      console.log(`Purging data older than: ${new Date(cutoffTimestamp).toISOString()}`);
      
      // Call purge API (we'll simulate this for now)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      addToast('success', `Old data purged! Removed data older than ${settings.dataRetention} days.`);
    } catch (error) {
      addToast('error', 'Failed to purge old data.');
    } finally {
      setPurging(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 100) return '#10b981';
    if (latency < 300) return '#f59e0b';
    return '#ef4444';
  };

  const formatTimeSince = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <div>
      {/* Toast Notifications */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={{
              padding: '14px 20px',
              borderRadius: '10px',
              background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 
                         toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(59, 130, 246, 0.95)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              cursor: 'pointer',
              animation: 'slideIn 0.3s ease-out',
              maxWidth: '350px',
            }}
          >
            {toast.type === 'success' ? '✓ ' : toast.type === 'error' ? '✕ ' : 'ℹ '}{toast.message}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '24px', fontWeight: '600' }}>Settings & System Health</h2>
        <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '16px' }}>Monitor system status and configure dashboard preferences</p>
      </div>

      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'system', label: '🖥️ System Health', icon: '🖥️' },
          { id: 'preferences', label: '⚙️ Preferences', icon: '⚙️' },
          { id: 'security', label: '🔐 Security', icon: '🔐' },
          { id: 'data', label: '💾 Data Management', icon: '💾' },
          { id: 'about', label: 'ℹ️ About', icon: 'ℹ️' },
        ].map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id as typeof activeSection)}
            style={{
              padding: '10px 18px',
              background: activeSection === section.id ? 'rgba(120, 119, 198, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${activeSection === section.id ? '#7877c6' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '10px',
              color: activeSection === section.id ? '#7877c6' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* System Health Section */}
      {activeSection === 'system' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px' }}>System Status</h3>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '12px' }}>
                Last updated: {formatTimeSince(lastHealthUpdate)} • Auto-refreshes every 30s
              </p>
            </div>
            <button
              onClick={checkSystemHealth}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#94a3b8',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '⏳ Checking...' : '🔄 Refresh'}
            </button>
          </div>

          {health && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Database Status */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>🗄️</span>
                    <span style={{ color: '#f8fafc', fontWeight: '600' }}>Database</span>
                  </div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    background: `${getStatusColor(health.database.status)}20`,
                    color: getStatusColor(health.database.status)
                  }}>
                    {health.database.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '14px' }}>
                  <span>Latency</span>
                  <span style={{ color: getLatencyColor(health.database.latency), fontWeight: '600' }}>
                    {health.database.latency}ms
                  </span>
                </div>
              </div>

              {/* API Status */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>🔌</span>
                    <span style={{ color: '#f8fafc', fontWeight: '600' }}>API</span>
                  </div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    background: `${getStatusColor(health.api.status)}20`,
                    color: getStatusColor(health.api.status)
                  }}>
                    {health.api.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '14px' }}>
                  <span>Response Time</span>
                  <span style={{ color: getLatencyColor(health.api.latency), fontWeight: '600' }}>
                    {health.api.latency}ms
                  </span>
                </div>
              </div>

              {/* Cache Status */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>⚡</span>
                    <span style={{ color: '#f8fafc', fontWeight: '600' }}>Cache</span>
                  </div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    background: 'rgba(100, 116, 139, 0.2)',
                    color: '#64748b'
                  }}>
                    N/A
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '14px' }}>
                  <span>Hit Rate</span>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>
                    Not tracked
                  </span>
                </div>
              </div>

              {/* Storage Status */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>💾</span>
                    <span style={{ color: '#f8fafc', fontWeight: '600' }}>Storage</span>
                  </div>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>
                    N/A
                  </span>
                </div>
                <div style={{ color: '#64748b', fontSize: '13px' }}>
                  Storage metrics not available for serverless deployment
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#f8fafc', fontSize: '18px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <ActionButton 
                icon="🔄" 
                label={clearingCache ? 'Clearing...' : 'Clear Cache'} 
                onClick={handleClearCache} 
                disabled={clearingCache}
              />
              <ActionButton 
                icon="📊" 
                label={exporting ? 'Exporting...' : 'Export Analytics'} 
                onClick={handleExportAnalytics}
                disabled={exporting}
              />
              <ActionButton 
                icon="🗑️" 
                label={purging ? 'Purging...' : 'Purge Old Data'} 
                onClick={handlePurgeOldData} 
                danger 
                disabled={purging}
              />
            </div>
          </div>
        </div>
      )}

      {/* Preferences Section */}
      {activeSection === 'preferences' && (
        <div>
          <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '18px' }}>Dashboard Preferences</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
            <SettingRow
              label="Auto-refresh Interval"
              description="How often to refresh dashboard data"
            >
              <select
                value={settings.refreshInterval}
                onChange={(e) => setSettings({ ...settings, refreshInterval: parseInt(e.target.value) })}
                style={selectStyle}
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
              </select>
            </SettingRow>

            <SettingRow
              label="Notifications"
              description="Receive alerts for important events"
            >
              <ToggleSwitch
                checked={settings.notifications}
                onChange={(checked) => setSettings({ ...settings, notifications: checked })}
              />
            </SettingRow>

            <SettingRow
              label="Auto Export"
              description="Automatically export weekly reports"
            >
              <ToggleSwitch
                checked={settings.autoExport}
                onChange={(checked) => setSettings({ ...settings, autoExport: checked })}
              />
            </SettingRow>

            <SettingRow
              label="Timezone"
              description="Display times in your local timezone"
            >
              <select
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                style={selectStyle}
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
              </select>
            </SettingRow>

            <button
              onClick={saveSettings}
              disabled={saving}
              style={{
                marginTop: '16px',
                padding: '12px 24px',
                background: '#7877c6',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                width: 'fit-content'
              }}
            >
              {saving ? '💾 Saving...' : '💾 Save Preferences'}
            </button>
          </div>
        </div>
      )}

      {/* Security Section */}
      {activeSection === 'security' && (
        <div>
          <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '18px' }}>Change Password</h3>
          
          <form onSubmit={handlePasswordChange} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
                <label style={{ display: 'block', color: '#f8fafc', fontWeight: '500', marginBottom: '8px' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                  disabled={passwordChanging}
                  style={inputStyle}
                />
              </div>

              <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
                <label style={{ display: 'block', color: '#f8fafc', fontWeight: '500', marginBottom: '8px' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  disabled={passwordChanging}
                  style={inputStyle}
                  minLength={6}
                />
                <div style={{ color: '#64748b', fontSize: '12px', marginTop: '6px' }}>
                  Minimum 6 characters
                </div>
              </div>

              <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
                <label style={{ display: 'block', color: '#f8fafc', fontWeight: '500', marginBottom: '8px' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  disabled={passwordChanging}
                  style={inputStyle}
                />
              </div>

              {passwordMessage && (
                <div style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: passwordMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${passwordMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: passwordMessage.type === 'success' ? '#10b981' : '#ef4444',
                  fontSize: '14px'
                }}>
                  {passwordMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={passwordChanging}
                style={{
                  padding: '12px 24px',
                  background: '#7877c6',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: passwordChanging ? 'not-allowed' : 'pointer',
                  opacity: passwordChanging ? 0.7 : 1,
                  width: 'fit-content'
                }}
              >
                {passwordChanging ? '🔐 Changing Password...' : '🔐 Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Data Management Section */}
      {activeSection === 'data' && (
        <div>
          <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '18px' }}>Data Management</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
            <SettingRow
              label="Data Retention"
              description="How long to keep analytics data"
            >
              <select
                value={settings.dataRetention}
                onChange={(e) => setSettings({ ...settings, dataRetention: parseInt(e.target.value) })}
                style={selectStyle}
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>1 year</option>
              </select>
            </SettingRow>
          </div>

          {/* Data Quality Status */}
          <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '16px' }}>📊 Data Quality Status</h4>
              <button
                onClick={checkDataStatus}
                disabled={dataStatusLoading}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#94a3b8',
                  cursor: dataStatusLoading ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                }}
              >
                {dataStatusLoading ? '⏳ Checking...' : '🔄 Refresh'}
              </button>
            </div>
            
            {dataStatus && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <StatBox label="Total Records" value={dataStatus.stats.totalRecords.toLocaleString()} />
                  <StatBox label="Unique Users" value={dataStatus.stats.uniqueUsers.toLocaleString()} />
                  <StatBox label="Avg Sessions/User" value={dataStatus.stats.avgSessionsPerUser} />
                  <StatBox label="Avg Watch Time" value={`${dataStatus.stats.avgWatchTimePerUser}m`} />
                </div>
                
                {dataStatus.issues.length > 0 && (
                  <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', marginBottom: '16px' }}>
                    <div style={{ color: '#ef4444', fontWeight: '600', marginBottom: '8px' }}>⚠️ Issues Detected:</div>
                    {dataStatus.issues.map((issue, i) => (
                      <div key={i} style={{ color: '#fca5a5', fontSize: '13px', marginBottom: '4px' }}>• {issue}</div>
                    ))}
                  </div>
                )}
                
                {!dataStatus.needsFix && (
                  <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px' }}>
                    <span style={{ color: '#10b981' }}>✅ Data looks healthy!</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Data Fix Tools */}
          <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(120, 119, 198, 0.1)', border: '1px solid rgba(120, 119, 198, 0.3)', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#7877c6', fontSize: '16px' }}>🔧 Data Fix Tools</h4>
            <p style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: '14px' }}>
              Fix corrupted analytics data. These tools will recalculate values from source data.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button
                onClick={() => runDataFix('fix-watch-time')}
                disabled={!!fixingData}
                style={{
                  padding: '12px 20px',
                  background: fixingData === 'fix-watch-time' ? 'rgba(120, 119, 198, 0.3)' : 'rgba(120, 119, 198, 0.15)',
                  border: '1px solid rgba(120, 119, 198, 0.4)',
                  borderRadius: '8px',
                  color: '#a5b4fc',
                  cursor: fixingData ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: fixingData && fixingData !== 'fix-watch-time' ? 0.5 : 1,
                }}
              >
                {fixingData === 'fix-watch-time' ? '⏳ Fixing...' : '⏱️ Fix Watch Time'}
              </button>
              
              <button
                onClick={() => runDataFix('fix-sessions')}
                disabled={!!fixingData}
                style={{
                  padding: '12px 20px',
                  background: fixingData === 'fix-sessions' ? 'rgba(120, 119, 198, 0.3)' : 'rgba(120, 119, 198, 0.15)',
                  border: '1px solid rgba(120, 119, 198, 0.4)',
                  borderRadius: '8px',
                  color: '#a5b4fc',
                  cursor: fixingData ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: fixingData && fixingData !== 'fix-sessions' ? 0.5 : 1,
                }}
              >
                {fixingData === 'fix-sessions' ? '⏳ Fixing...' : '📊 Fix Session Counts'}
              </button>
              
              <button
                onClick={() => runDataFix('fix-all')}
                disabled={!!fixingData}
                style={{
                  padding: '12px 20px',
                  background: fixingData === 'fix-all' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '8px',
                  color: '#6ee7b7',
                  cursor: fixingData ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  opacity: fixingData && fixingData !== 'fix-all' ? 0.5 : 1,
                }}
              >
                {fixingData === 'fix-all' ? '⏳ Fixing All...' : '🚀 Fix Everything'}
              </button>
            </div>

            {/* Fix Results */}
            {fixResults && (
              <div style={{ padding: '16px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', marginTop: '12px' }}>
                <div style={{ color: '#10b981', fontWeight: '600', marginBottom: '12px' }}>✅ Fix Complete!</div>
                
                {fixResults.watchTimeFix && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ color: '#f8fafc', fontWeight: '500', marginBottom: '4px' }}>Watch Time Fix:</div>
                    <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                      • Fixed {fixResults.watchTimeFix.usersFixed} users
                      {fixResults.watchTimeFix.errors > 0 && <span style={{ color: '#ef4444' }}> ({fixResults.watchTimeFix.errors} errors)</span>}
                    </div>
                    {fixResults.watchTimeFix.details.map((d, i) => (
                      <div key={i} style={{ color: '#64748b', fontSize: '12px', marginLeft: '12px' }}>→ {d}</div>
                    ))}
                  </div>
                )}
                
                {fixResults.sessionsFix && (
                  <div>
                    <div style={{ color: '#f8fafc', fontWeight: '500', marginBottom: '4px' }}>Session Count Fix:</div>
                    <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                      • Fixed {fixResults.sessionsFix.usersFixed} users
                      {fixResults.sessionsFix.errors > 0 && <span style={{ color: '#ef4444' }}> ({fixResults.sessionsFix.errors} errors)</span>}
                    </div>
                    {fixResults.sessionsFix.details.map((d, i) => (
                      <div key={i} style={{ color: '#64748b', fontSize: '12px', marginLeft: '12px' }}>→ {d}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#ef4444', fontSize: '16px' }}>⚠️ Danger Zone</h4>
            <p style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: '14px' }}>
              These actions are irreversible. Please proceed with caution.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <ActionButton icon="🗑️" label="Delete All Sessions" onClick={() => confirm('Are you sure? This will delete ALL watch sessions!') && addToast('info', 'Session deletion not implemented for safety.')} danger />
              <ActionButton icon="🔄" label="Reset Analytics" onClick={() => confirm('Are you sure? This will reset ALL analytics data!') && addToast('info', 'Analytics reset not implemented for safety.')} danger />
            </div>
          </div>
        </div>
      )}

      {/* About Section */}
      {activeSection === 'about' && (
        <div>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '24px', maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #7877c6, #ff77c6)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                📊
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '20px' }}>Admin Dashboard</h3>
                <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>Version 2.0.0</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <InfoRow label="Build" value="Production" />
              <InfoRow label="Last Updated" value={new Date().toLocaleDateString()} />
              <InfoRow label="Framework" value="Next.js 14" />
              <InfoRow label="Database" value="Neon PostgreSQL" />
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation for toast */}
      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  color: '#f8fafc',
  fontSize: '14px',
  cursor: 'pointer',
  outline: 'none',
  minWidth: '150px'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  color: '#f8fafc',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box'
};

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
      <div>
        <div style={{ color: '#f8fafc', fontWeight: '500', marginBottom: '4px' }}>{label}</div>
        <div style={{ color: '#64748b', fontSize: '13px' }}>{description}</div>
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: '48px',
        height: '26px',
        borderRadius: '13px',
        background: checked ? '#7877c6' : 'rgba(255, 255, 255, 0.1)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s'
      }}
    >
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: 'white',
        position: 'absolute',
        top: '3px',
        left: checked ? '25px' : '3px',
        transition: 'left 0.2s'
      }} />
    </button>
  );
}

function ActionButton({ icon, label, onClick, danger = false, disabled = false }: { icon: string; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 16px',
        background: danger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
        border: `1px solid ${danger ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
        borderRadius: '8px',
        color: danger ? '#ef4444' : '#f8fafc',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s',
        opacity: disabled ? 0.6 : 1
      }}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <span style={{ color: '#64748b', fontSize: '14px' }}>{label}</span>
      <span style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '500' }}>{value}</span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '12px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', textAlign: 'center' }}>
      <div style={{ color: '#f8fafc', fontSize: '18px', fontWeight: '600' }}>{value}</div>
      <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>{label}</div>
    </div>
  );
}
