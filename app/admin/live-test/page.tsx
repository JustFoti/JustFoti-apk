'use client';

/**
 * Simple Live User Test Page
 * Directly fetches from CF Worker to verify data flow
 */

import { useState, useEffect } from 'react';

const CF_WORKER_URL = 'https://flyx-analytics.vynx.workers.dev';

export default function LiveTestPage() {
  const [health, setHealth] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [liveActivity, setLiveActivity] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch health
      const healthRes = await fetch(`${CF_WORKER_URL}/health`);
      const healthData = await healthRes.json();
      setHealth(healthData);
      console.log('[LiveTest] Health:', healthData);

      // Fetch unified stats
      const statsRes = await fetch(`${CF_WORKER_URL}/unified-stats`);
      const statsData = await statsRes.json();
      setStats(statsData);
      console.log('[LiveTest] Stats:', statsData);

      // Fetch live activity
      const liveRes = await fetch(`${CF_WORKER_URL}/live-activity`);
      const liveData = await liveRes.json();
      setLiveActivity(liveData);
      console.log('[LiveTest] Live Activity:', liveData);

    } catch (e) {
      console.error('[LiveTest] Error:', e);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '24px', color: '#f8fafc' }}>
      <h1 style={{ marginBottom: '24px' }}>🧪 Live User Count Test</h1>
      
      <button 
        onClick={fetchData}
        style={{ 
          padding: '12px 24px', 
          background: '#7877c6', 
          border: 'none', 
          borderRadius: '8px', 
          color: 'white',
          cursor: 'pointer',
          marginBottom: '24px'
        }}
      >
        🔄 Refresh Now
      </button>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: '#ef4444' }}>Error: {error}</p>}

      {/* Health Check */}
      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 12px 0' }}>📡 Worker Health</h2>
        {health && (
          <div>
            <p><strong>Status:</strong> {health.status}</p>
            <p><strong>Live Users in Memory:</strong> <span style={{ fontSize: '24px', color: '#10b981' }}>{health.liveUsers}</span></p>
            <p><strong>Architecture:</strong> {health.architecture}</p>
            <p><strong>Pending Page Views:</strong> {health.pendingPageViews}</p>
            <p><strong>Pending Watch Sessions:</strong> {health.pendingWatchSessions}</p>
          </div>
        )}
      </div>

      {/* Unified Stats */}
      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 12px 0' }}>📊 Unified Stats (realtime)</h2>
        {stats?.realtime && (
          <div>
            <p><strong>Total Active:</strong> <span style={{ fontSize: '24px', color: '#10b981' }}>{stats.realtime.totalActive}</span></p>
            <p><strong>Watching:</strong> {stats.realtime.watching}</p>
            <p><strong>Browsing:</strong> {stats.realtime.browsing}</p>
            <p><strong>Live TV:</strong> {stats.realtime.livetv}</p>
          </div>
        )}
      </div>

      {/* Live Activity */}
      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 12px 0' }}>🟢 Live Activity</h2>
        {liveActivity && (
          <div>
            <p><strong>Summary Total:</strong> <span style={{ fontSize: '24px', color: '#10b981' }}>{liveActivity.summary?.total}</span></p>
            <p><strong>Activities Count:</strong> {liveActivity.activities?.length}</p>
            {liveActivity.activities?.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <h3>Active Users:</h3>
                <ul>
                  {liveActivity.activities.slice(0, 10).map((a: any, i: number) => (
                    <li key={i}>
                      {a.activity_type} - {a.country || 'Unknown'} - {a.content_title || 'No content'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Raw JSON */}
      <details style={{ marginTop: '24px' }}>
        <summary style={{ cursor: 'pointer', marginBottom: '12px' }}>📋 Raw JSON Data</summary>
        <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', overflow: 'auto', fontSize: '12px' }}>
          {JSON.stringify({ health, stats, liveActivity }, null, 2)}
        </pre>
      </details>
    </div>
  );
}
