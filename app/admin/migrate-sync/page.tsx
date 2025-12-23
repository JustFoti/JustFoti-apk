'use client';

import { useState } from 'react';

interface SyncAccountPreview {
  id: string;
  codeHashPreview: string;
  lastSyncAt: number;
  createdAt: number;
  deviceCount: number;
  dataSize: number;
}

export default function MigrateSyncPage() {
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [accounts, setAccounts] = useState<SyncAccountPreview[]>([]);
  const [cfSyncUrl, setCfSyncUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    total: number;
    migrated: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/migrate-sync');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAccounts(data.accounts || []);
      setCfSyncUrl(data.cfSyncUrl || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    if (!confirm(`Migrate ${accounts.length} accounts from Neon to D1?`)) return;
    
    setMigrating(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/migrate-sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMigrating(false);
    }
  };

  const formatDate = (ts: number) => {
    if (!ts) return 'N/A';
    return new Date(ts).toLocaleString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>
        Migrate Sync Data: Neon → D1
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
        Transfer sync accounts from Neon PostgreSQL to Cloudflare D1
      </p>

      {/* Info Box */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ margin: 0, fontSize: '14px' }}>
          <strong>CF Sync Worker:</strong> {cfSyncUrl || 'Not configured'}
        </p>
        <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#94a3b8' }}>
          Make sure to deploy the sync worker with the /admin/migrate endpoint before migrating.
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={fetchAccounts}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Loading...' : 'Fetch Neon Accounts'}
        </button>

        {accounts.length > 0 && (
          <button
            onClick={runMigration}
            disabled={migrating}
            style={{
              padding: '10px 20px',
              background: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: migrating ? 'not-allowed' : 'pointer',
              opacity: migrating ? 0.7 : 1,
            }}
          >
            {migrating ? 'Migrating...' : `Migrate ${accounts.length} Accounts to D1`}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          color: '#ef4444',
        }}>
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{
          background: result.failed === 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
          border: `1px solid ${result.failed === 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>Migration Complete</h3>
          <p style={{ margin: '4px 0' }}>Total: {result.total}</p>
          <p style={{ margin: '4px 0', color: '#22c55e' }}>✅ Migrated: {result.migrated}</p>
          {result.failed > 0 && (
            <>
              <p style={{ margin: '4px 0', color: '#ef4444' }}>❌ Failed: {result.failed}</p>
              {result.errors.length > 0 && (
                <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '13px', color: '#94a3b8' }}>
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {/* Accounts Table */}
      {accounts.length > 0 && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>ID</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>Code Hash</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>Last Sync</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>Created</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px' }}>Data Size</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px', fontSize: '13px', fontFamily: 'monospace' }}>
                    {acc.id.substring(0, 20)}...
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', fontFamily: 'monospace' }}>
                    {acc.codeHashPreview}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{formatDate(acc.lastSyncAt)}</td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{formatDate(acc.createdAt)}</td>
                  <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right' }}>
                    {formatBytes(acc.dataSize)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {accounts.length === 0 && !loading && (
        <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>
          Click "Fetch Neon Accounts" to see sync data in Neon
        </p>
      )}
    </div>
  );
}
