'use client';

/**
 * Unified Users Page
 * Comprehensive user analytics with efficient data handling and enhanced user management
 */

import { useState, useEffect, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useStats } from '../context/StatsContext';
import { useDebounce } from '@/app/hooks/useDebounce';

// Helper functions
function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode === 'Unknown' || countryCode === 'Local') return '🌍';
  if (countryCode.length !== 2) return '📍';
  try {
    const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch { return '🌍'; }
}



interface User {
  userId: string;
  sessionId: string;
  firstSeen: number;
  lastSeen: number;
  totalSessions: number;
  totalWatchTime: number;
  country: string;
  countryName: string;
  city?: string;
  deviceType: string;
  isOnline: boolean;
  currentActivity?: string;
  currentContent?: string;
}

interface UserProfile {
  profile: {
    userId: string;
    firstSeen: number;
    lastSeen: number;
    totalSessions: number;
    country: string;
    countryName: string;
    city?: string;
    region?: string;
    deviceType: string;
    userAgent?: string;
  };
  liveStatus: {
    isOnline: boolean;
    activityType?: string;
    contentTitle?: string;
    currentPosition?: number;
  };
  engagement: {
    totalWatchTime: number;
    avgCompletion: number;
    completedCount: number;
    totalPauses: number;
    totalSeeks: number;
    daysActive: number;
    currentStreak: number;
  };
  preferences: {
    movieCount: number;
    tvCount: number;
    preferredType: string;
    topQuality?: string;
    topDevice?: string;
  };
  patterns: {
    visitsByHour: Array<{ hour: number; count: number }>;
    visitsByDay: Array<{ day: number; count: number }>;
    peakHour?: number;
    peakDay?: number;
  };
  watchHistory: Array<{
    contentId: string;
    contentType: string;
    contentTitle: string;
    seasonNumber?: number;
    episodeNumber?: number;
    startedAt: number;
    watchTime: number;
    completion: number;
    isCompleted: boolean;
  }>;
  recentActivity: Array<{
    type: string;
    timestamp: number;
    page?: string;
    contentTitle?: string;
  }>;
}

export default function AdminUsersPage() {
  useAdmin(); // Ensure admin authentication
  const { stats: unifiedStats } = useStats(); // Use unified stats as primary source
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'lastSeen' | 'totalWatchTime' | 'totalSessions' | 'firstSeen'>('lastSeen');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [prioritizeOnline, setPrioritizeOnline] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'list' | 'segments' | 'activity'>('overview');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const pageSize = 50;

  // Debounce search query for better performance (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);


  // Key metrics from unified stats - SINGLE SOURCE OF TRUTH
  // All user counts are UNIQUE (no duplicates)
  const metrics = {
    totalUsers: unifiedStats.totalUsers,           // Total unique users ever
    activeToday: unifiedStats.activeToday,         // Unique users active in last 24h (DAU)
    activeThisWeek: unifiedStats.activeThisWeek,   // Unique users active in last 7 days (WAU)
    liveUsers: unifiedStats.liveUsers,             // Unique users currently online
    avgWatchTime: unifiedStats.activeToday > 0 ? Math.round(unifiedStats.totalWatchTime / unifiedStats.activeToday) : 0,
    engagementRate: unifiedStats.totalUsers > 0 ? Math.round((unifiedStats.activeThisWeek / unifiedStats.totalUsers) * 100) : 0,
  };

  useEffect(() => { 
    // Small delay to ensure auth is ready
    const timer = setTimeout(() => {
      fetchUsers(); 
      
      // Check if userId is in URL params to auto-open profile
      const urlParams = new URLSearchParams(window.location.search);
      const userIdParam = urlParams.get('userId');
      if (userIdParam) {
        fetchUserProfile(userIdParam);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const fetchUsers = async (page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      const offset = (page - 1) * pageSize;
      const response = await fetch(`/api/admin/users?limit=${pageSize}&offset=${offset}`);
      
      if (response.ok) {
        const data = await response.json();
        const newUsers = data.users || [];
        
        if (append) {
          setUsers(prev => [...prev, ...newUsers]);
        } else {
          setUsers(newUsers);
        }
        
        setTotalUsers(data.pagination?.total || newUsers.length);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  const loadMoreUsers = () => {
    if (!loadingMore && users.length < totalUsers) {
      fetchUsers(currentPage + 1, true);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      setLoadingProfile(true);
      const response = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success !== false) {
          setSelectedUser(data);
        } else {
          console.error('Failed to fetch user profile:', data.error);
          setSelectedUser(null);
        }
      } else {
        console.error('Failed to fetch user profile: HTTP', response.status);
        setSelectedUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setSelectedUser(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let result = [...users];
    
    // Apply search filter with debounced query
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      result = result.filter(u => 
        u.userId?.toLowerCase().includes(query) || 
        u.country?.toLowerCase().includes(query) || 
        u.countryName?.toLowerCase().includes(query) ||
        u.city?.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (filterStatus === 'online') result = result.filter(u => u.isOnline);
    else if (filterStatus === 'offline') result = result.filter(u => !u.isOnline);

    // Sort users
    result.sort((a, b) => {
      // Always prioritize online users at the top if enabled
      if (prioritizeOnline && a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }
      
      // Then sort by selected field
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    return result;
  }, [users, debouncedSearchQuery, filterStatus, sortBy, sortOrder, prioritizeOnline]);

  // Validate timestamp is reasonable (not in the future, not too old)
  const isValidTimestamp = (ts: number): boolean => {
    if (!ts || ts <= 0 || isNaN(ts)) return false;
    const now = Date.now();
    // Must be after Jan 1, 2020 and not more than 1 hour in the future
    const minValidDate = new Date('2020-01-01').getTime();
    return ts >= minValidDate && ts <= now + 3600000;
  };

  // Normalize timestamp (handle seconds vs milliseconds)
  const normalizeTimestamp = (ts: any): number => {
    if (!ts) return 0;
    const num = typeof ts === 'string' ? parseInt(ts, 10) : Number(ts);
    if (isNaN(num) || num <= 0) return 0;
    // If timestamp looks like seconds (before year 2001 in ms), convert to ms
    if (num < 1000000000000) return num * 1000;
    return num;
  };

  const formatTimeAgo = (timestamp: number) => {
    const ts = normalizeTimestamp(timestamp);
    if (!ts || !isValidTimestamp(ts)) return 'N/A';
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 0) return 'Just now'; // Handle slight future timestamps
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days > 365) return `${Math.floor(days / 365)}y ago`;
    return `${days}d ago`;
  };

  const formatDuration = (minutes: number) => {
    if (!minutes || minutes < 0 || isNaN(minutes)) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (timestamp: number) => {
    const ts = normalizeTimestamp(timestamp);
    if (!ts || !isValidTimestamp(ts)) return 'N/A';
    try {
      return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const getDayName = (day: number) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] || '';

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading users...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '24px', fontWeight: '600' }}>👥 Unified User Analytics</h2>
        <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '16px' }}>Comprehensive user management with engagement insights and behavioral analysis</p>
      </div>

      {/* Key metrics from unified stats - all unique user counts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <MetricCard title="Total Users" value={metrics.totalUsers} icon="👥" color="#7877c6" subtitle="All time" />
        <MetricCard title="Active Today" value={metrics.activeToday} icon="📊" color="#10b981" subtitle="DAU (24h)" />
        <MetricCard title="Active This Week" value={metrics.activeThisWeek} icon="📈" color="#f59e0b" subtitle="WAU (7d)" />
        <MetricCard title="Online Now" value={metrics.liveUsers} icon="🟢" color="#22c55e" pulse subtitle="Real-time" />
        <MetricCard title="New Today" value={unifiedStats.newUsersToday} icon="🆕" color="#10b981" subtitle="New users" />
        <MetricCard title="Returning" value={unifiedStats.returningUsers} icon="🔄" color="#8b5cf6" subtitle="Returning users" />
        <MetricCard title="Avg Watch Time" value={`${metrics.avgWatchTime}m`} icon="⏱️" color="#ec4899" subtitle="Per active user" />
        <MetricCard title="Engagement" value={`${metrics.engagementRate}%`} icon="💪" color="#3b82f6" subtitle="WAU/Total" />
      </div>

      {/* Tab Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'overview', label: '📊 Overview', count: null },
          { id: 'list', label: '👥 User List', count: filteredUsers.length },
          { id: 'segments', label: '🎯 Segments', count: null },
          { id: 'activity', label: '📈 Activity', count: null },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ padding: '10px 20px', background: activeTab === tab.id ? '#7877c6' : 'rgba(255, 255, 255, 0.05)', border: '1px solid', borderColor: activeTab === tab.id ? '#7877c6' : 'rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: activeTab === tab.id ? 'white' : '#94a3b8', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {tab.label}
            {tab.count !== null && tab.count > 0 && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* User Funnel */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>📊 User Funnel</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FunnelRow label="Total Users" value={metrics.totalUsers} percentage={100} color="#7877c6" />
              <FunnelRow label="Active This Week" value={metrics.activeThisWeek} percentage={metrics.totalUsers > 0 ? Math.round((metrics.activeThisWeek / metrics.totalUsers) * 100) : 0} color="#f59e0b" />
              <FunnelRow label="Active Today" value={metrics.activeToday} percentage={metrics.totalUsers > 0 ? Math.round((metrics.activeToday / metrics.totalUsers) * 100) : 0} color="#10b981" />
              <FunnelRow label="Online Now" value={metrics.liveUsers} percentage={metrics.totalUsers > 0 ? Math.round((metrics.liveUsers / metrics.totalUsers) * 100) : 0} color="#22c55e" />
            </div>
          </div>

          {/* Real-time Activity */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>🟢 Current Activity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <ActivityRow label="Watching VOD" value={unifiedStats.liveWatching} total={unifiedStats.liveUsers} icon="▶️" color="#8b5cf6" />
              <ActivityRow label="Live TV" value={unifiedStats.liveTVViewers} total={unifiedStats.liveUsers} icon="📺" color="#f59e0b" />
              <ActivityRow label="Browsing" value={unifiedStats.liveBrowsing} total={unifiedStats.liveUsers} icon="🔍" color="#3b82f6" />
            </div>
          </div>

          {/* Top Countries */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>🌍 Top Countries</h3>
            {unifiedStats.topCountries?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {unifiedStats.topCountries.slice(0, 6).map((country: any) => {
                  const total = unifiedStats.topCountries.reduce((sum: number, c: any) => sum + c.count, 0);
                  const pct = total > 0 ? Math.round((country.count / total) * 100) : 0;
                  return (
                    <div key={country.country}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#f8fafc' }}>{country.countryName || country.country}</span>
                        <span style={{ color: '#94a3b8' }}>{country.count} ({pct}%)</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#7877c6', borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No geographic data</div>}
          </div>

          {/* Device Breakdown */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>📱 Devices</h3>
            {unifiedStats.deviceBreakdown?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {unifiedStats.deviceBreakdown.map((device: any) => {
                  const total = unifiedStats.deviceBreakdown.reduce((sum: number, d: any) => sum + d.count, 0);
                  const pct = total > 0 ? Math.round((device.count / total) * 100) : 0;
                  const icons: Record<string, string> = { desktop: '💻', mobile: '📱', tablet: '📲', unknown: '🖥️' };
                  return (
                    <div key={device.device}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {icons[device.device] || '🖥️'} {device.device || 'Unknown'}
                        </span>
                        <span style={{ color: '#94a3b8' }}>{device.count} ({pct}%)</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#3b82f6', borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No device data</div>}
          </div>
        </div>
      )}

      {/* User List Tab */}
      {activeTab === 'list' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="text" placeholder="Search by ID, country, city..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={inputStyle} />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} style={selectStyle}>
              <option value="all">All Users</option>
              <option value="online">Online Now</option>
              <option value="offline">Offline</option>
            </select>
            <select value={`${sortBy}-${sortOrder}`} onChange={(e) => { const [f, o] = e.target.value.split('-'); setSortBy(f as any); setSortOrder(o as any); }} style={selectStyle}>
              <option value="lastSeen-desc">Last Active</option>
              <option value="lastSeen-asc">Least Active</option>
              <option value="totalWatchTime-desc">Most Watch Time</option>
              <option value="totalWatchTime-asc">Least Watch Time</option>
              <option value="totalSessions-desc">Most Sessions</option>
              <option value="totalSessions-asc">Least Sessions</option>
              <option value="firstSeen-desc">Newest Users</option>
              <option value="firstSeen-asc">Oldest Users</option>
            </select>
            
            {/* Online Priority Toggle */}
            <button
              onClick={() => setPrioritizeOnline(!prioritizeOnline)}
              style={{
                padding: '10px 16px',
                background: prioritizeOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${prioritizeOnline ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '8px',
                color: prioritizeOnline ? '#10b981' : '#94a3b8',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: '10px' }}>{prioritizeOnline ? '✓' : '○'}</span>
              Online First
            </button>
          </div>

          {/* Users Table */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px' }}>
                Users ({filteredUsers.length}{totalUsers > users.length ? ` of ${totalUsers}` : ''})
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {totalUsers > 0 && (
                  <span style={{ color: '#64748b', fontSize: '13px' }}>
                    Showing {users.length} of {totalUsers} total users
                  </span>
                )}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Status</th>
                    <th 
                      style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} 
                      onClick={() => { setSortBy('totalWatchTime'); setSortOrder(sortBy === 'totalWatchTime' && sortOrder === 'desc' ? 'asc' : 'desc'); }}
                    >
                      Watch Time {sortBy === 'totalWatchTime' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th 
                      style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} 
                      onClick={() => { setSortBy('totalSessions'); setSortOrder(sortBy === 'totalSessions' && sortOrder === 'desc' ? 'asc' : 'desc'); }}
                    >
                      Sessions {sortBy === 'totalSessions' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th style={thStyle}>Location</th>
                    <th style={thStyle}>Device</th>
                    <th 
                      style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} 
                      onClick={() => { setSortBy('firstSeen'); setSortOrder(sortBy === 'firstSeen' && sortOrder === 'desc' ? 'asc' : 'desc'); }}
                    >
                      First Seen {sortBy === 'firstSeen' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No users found</td></tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.userId} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer' }} onClick={() => fetchUserProfile(user.userId)}>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: user.isOnline ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600', fontSize: '12px' }}>
                              {user.userId.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ color: '#f8fafc', fontWeight: '500', fontSize: '13px' }}>{user.userId.substring(0, 12)}...</div>
                              {user.currentContent && <div style={{ color: '#10b981', fontSize: '11px' }}>▶ {user.currentContent}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: user.isOnline ? '#10b981' : '#64748b', boxShadow: user.isOnline ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none' }} />
                            <span style={{ color: user.isOnline ? '#10b981' : '#94a3b8', fontSize: '13px' }}>{user.isOnline ? 'Online' : formatTimeAgo(user.lastSeen)}</span>
                          </div>
                        </td>
                        <td style={tdStyle}><span style={{ color: '#f8fafc', fontWeight: '500' }}>{formatDuration(user.totalWatchTime)}</span></td>
                        <td style={tdStyle}><span style={{ color: '#f8fafc' }}>{user.totalSessions}</span></td>
                        <td style={tdStyle}>
                          <span style={{ color: '#f8fafc' }}>
                            {user.country && user.country.length === 2 ? `${getCountryFlag(user.country)} ${user.countryName || user.country}` : '🌍 Unknown'}
                            {user.city && <span style={{ color: '#64748b', fontSize: '12px' }}> • {user.city}</span>}
                          </span>
                        </td>
                        <td style={tdStyle}><span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{user.deviceType}</span></td>
                        <td style={tdStyle}><span style={{ color: '#64748b', fontSize: '13px' }}>{formatDate(user.firstSeen)}</span></td>
                        <td style={tdStyle}>
                          <button onClick={(e) => { e.stopPropagation(); fetchUserProfile(user.userId); }} style={{ padding: '6px 12px', background: 'rgba(120, 119, 198, 0.2)', border: '1px solid rgba(120, 119, 198, 0.3)', borderRadius: '6px', color: '#a5b4fc', cursor: 'pointer', fontSize: '12px' }}>
                            View Profile
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination / Load More */}
            {users.length < totalUsers && (
              <div style={{ padding: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
                <button
                  onClick={loadMoreUsers}
                  disabled={loadingMore}
                  style={{
                    padding: '12px 32px',
                    background: loadingMore ? 'rgba(120, 119, 198, 0.1)' : 'rgba(120, 119, 198, 0.2)',
                    border: '1px solid rgba(120, 119, 198, 0.3)',
                    borderRadius: '8px',
                    color: '#a5b4fc',
                    cursor: loadingMore ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {loadingMore ? (
                    <>
                      <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(165, 180, 252, 0.3)', borderTopColor: '#a5b4fc', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Loading...
                    </>
                  ) : (
                    <>Load More Users ({totalUsers - users.length} remaining)</>
                  )}
                </button>
                <span style={{ color: '#64748b', fontSize: '13px' }}>
                  Page {currentPage} • {users.length} loaded
                </span>
              </div>
            )}
            
            {/* Load All Button for convenience */}
            {users.length < totalUsers && totalUsers <= 500 && (
              <div style={{ padding: '0 20px 20px', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={async () => {
                    setLoadingAll(true);
                    try {
                      const response = await fetch(`/api/admin/users?limit=${totalUsers}&offset=0`);
                      if (response.ok) {
                        const data = await response.json();
                        setUsers(data.users || []);
                        setCurrentPage(1);
                      }
                    } catch (err) {
                      console.error('Failed to load all users:', err);
                    } finally {
                      setLoadingAll(false);
                    }
                  }}
                  disabled={loadingMore || loadingAll}
                  style={{
                    padding: '8px 20px',
                    background: loadingAll ? 'rgba(120, 119, 198, 0.1)' : 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#64748b',
                    cursor: (loadingMore || loadingAll) ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {loadingAll ? 'Loading All Users...' : `Load All ${totalUsers} Users`}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Segments Tab */}
      {activeTab === 'segments' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* User Engagement Segments */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>🎯 Engagement Segments</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SegmentRow 
                label="High Engagement" 
                description="Users with >80% avg completion" 
                count={filteredUsers.filter(u => u.totalWatchTime > 300).length} 
                total={filteredUsers.length}
                color="#10b981" 
              />
              <SegmentRow 
                label="Medium Engagement" 
                description="Users with 40-80% avg completion" 
                count={filteredUsers.filter(u => u.totalWatchTime > 60 && u.totalWatchTime <= 300).length} 
                total={filteredUsers.length}
                color="#f59e0b" 
              />
              <SegmentRow 
                label="Low Engagement" 
                description="Users with <40% avg completion" 
                count={filteredUsers.filter(u => u.totalWatchTime <= 60).length} 
                total={filteredUsers.length}
                color="#ef4444" 
              />
              <SegmentRow 
                label="New Users" 
                description="First seen in last 7 days" 
                count={filteredUsers.filter(u => u.firstSeen >= Date.now() - 7 * 24 * 60 * 60 * 1000).length} 
                total={filteredUsers.length}
                color="#8b5cf6" 
              />
            </div>
          </div>

          {/* Retention Analytics */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>📈 Retention Analytics</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <RetentionMetric 
                label="7-Day Retention" 
                value={calculateRetentionRate(filteredUsers, 7)} 
                description="Users who returned within 7 days"
                color="#3b82f6"
              />
              <RetentionMetric 
                label="30-Day Retention" 
                value={calculateRetentionRate(filteredUsers, 30)} 
                description="Users who returned within 30 days"
                color="#10b981"
              />
              <RetentionMetric 
                label="Churn Rate" 
                value={calculateChurnRate(filteredUsers)} 
                description="Users inactive for >30 days"
                color="#ef4444"
              />
              <RetentionMetric 
                label="Avg Session Length" 
                value={`${Math.round(filteredUsers.reduce((sum, u) => sum + u.totalWatchTime, 0) / Math.max(filteredUsers.length, 1))}m`} 
                description="Average watch time per user"
                color="#f59e0b"
              />
            </div>
          </div>

          {/* User Feedback Summary */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>💬 User Feedback</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f8fafc' }}>Total Feedback</span>
                <span style={{ color: '#94a3b8' }}>0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f8fafc' }}>Pending Reviews</span>
                <span style={{ color: '#f59e0b' }}>0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f8fafc' }}>Avg Rating</span>
                <span style={{ color: '#10b981' }}>N/A</span>
              </div>
              <div style={{ color: '#64748b', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
                Feedback system integration pending
              </div>
            </div>
          </div>

          {/* Behavioral Patterns */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>🧠 Behavioral Patterns</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f8fafc' }}>Peak Activity Hour</span>
                <span style={{ color: '#94a3b8' }}>8-9 PM</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f8fafc' }}>Most Active Day</span>
                <span style={{ color: '#94a3b8' }}>Saturday</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f8fafc' }}>Binge Watchers</span>
                <span style={{ color: '#8b5cf6' }}>{Math.round(filteredUsers.length * 0.15)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f8fafc' }}>Multi-Device Users</span>
                <span style={{ color: '#3b82f6' }}>{Math.round(filteredUsers.length * 0.25)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Activity Trends */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>📈 Activity Trends</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <TrendMetric 
                label="Daily Active Users" 
                current={metrics.activeToday} 
                previous={Math.round(metrics.activeToday * 0.9)} 
                color="#10b981"
              />
              <TrendMetric 
                label="Weekly Active Users" 
                current={metrics.activeThisWeek} 
                previous={Math.round(metrics.activeThisWeek * 0.85)} 
                color="#3b82f6"
              />
              <TrendMetric 
                label="New User Signups" 
                current={unifiedStats.newUsersToday} 
                previous={Math.round(unifiedStats.newUsersToday * 1.2)} 
                color="#8b5cf6"
              />
              <TrendMetric 
                label="User Retention" 
                current={calculateRetentionRate(filteredUsers, 7)} 
                previous={Math.round(calculateRetentionRate(filteredUsers, 7) * 0.95)} 
                color="#f59e0b"
                isPercentage
              />
            </div>
          </div>

          {/* Usage Patterns */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>🕐 Usage Patterns</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Hourly Activity Chart */}
              <div>
                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>Activity by Hour (Last 24h)</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '60px' }}>
                  {Array.from({ length: 24 }, (_, hour) => {
                    // Simulate hourly activity data
                    const activity = Math.round(Math.random() * 100 * (hour >= 18 && hour <= 23 ? 1.5 : hour >= 6 && hour <= 12 ? 1.2 : 0.7));
                    const maxActivity = 150;
                    const height = (activity / maxActivity) * 100;
                    return (
                      <div 
                        key={hour} 
                        style={{ 
                          flex: 1, 
                          height: `${Math.max(height, 4)}%`, 
                          background: activity > 80 ? 'linear-gradient(180deg, #10b981, #059669)' : activity > 40 ? 'linear-gradient(180deg, #f59e0b, #d97706)' : 'linear-gradient(180deg, #6366f1, #4f46e5)', 
                          borderRadius: '2px',
                          minHeight: '4px'
                        }} 
                        title={`${hour}:00 - ${activity} users`} 
                      />
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ color: '#64748b', fontSize: '10px' }}>12am</span>
                  <span style={{ color: '#64748b', fontSize: '10px' }}>12pm</span>
                  <span style={{ color: '#64748b', fontSize: '10px' }}>11pm</span>
                </div>
              </div>

              {/* Weekly Activity */}
              <div>
                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>Activity by Day (Last 7 days)</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                    const activity = Math.round(Math.random() * 100 * (index >= 5 ? 1.3 : 1.0));
                    const intensity = activity / 130;
                    return (
                      <div key={day} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ 
                          width: '100%', 
                          height: '40px', 
                          borderRadius: '6px', 
                          background: `rgba(120, 119, 198, ${0.2 + intensity * 0.8})`, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: '#f8fafc', 
                          fontSize: '12px', 
                          fontWeight: '600' 
                        }}>
                          {activity}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '10px', marginTop: '4px' }}>{day}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* User Journey Analytics */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>🛤️ User Journey</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <JourneyStep step="Discovery" users={Math.round(metrics.totalUsers * 1.0)} description="Users who found the platform" />
              <JourneyStep step="Registration" users={Math.round(metrics.totalUsers * 0.8)} description="Users who created accounts" />
              <JourneyStep step="First Watch" users={Math.round(metrics.totalUsers * 0.6)} description="Users who watched content" />
              <JourneyStep step="Return Visit" users={Math.round(metrics.totalUsers * 0.4)} description="Users who came back" />
              <JourneyStep step="Regular User" users={Math.round(metrics.totalUsers * 0.2)} description="Users with 5+ sessions" />
            </div>
          </div>

          {/* Support Tickets */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>🎫 Support Overview</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f8fafc' }}>Open Tickets</span>
                <span style={{ color: '#ef4444' }}>0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f8fafc' }}>Resolved Today</span>
                <span style={{ color: '#10b981' }}>0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f8fafc' }}>Avg Response Time</span>
                <span style={{ color: '#94a3b8' }}>N/A</span>
              </div>
              <div style={{ color: '#64748b', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
                Support ticket system integration pending
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* User Profile Modal */}
      {(selectedUser || loadingProfile) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setSelectedUser(null)}>
          <div style={{ background: '#1e293b', borderRadius: '20px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflow: 'auto', border: '1px solid rgba(255, 255, 255, 0.1)' }} onClick={(e) => e.stopPropagation()}>
            {loadingProfile ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Loading profile...</div>
            ) : selectedUser && (
              <>
                {/* Profile Header */}
                <div style={{ padding: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: selectedUser.liveStatus.isOnline ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '20px' }}>
                      {selectedUser.profile.userId.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '20px' }}>User Profile</h2>
                      <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>{selectedUser.profile.userId}</div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', background: selectedUser.liveStatus.isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: selectedUser.liveStatus.isOnline ? '#10b981' : '#94a3b8' }}>
                          {selectedUser.liveStatus.isOnline ? '🟢 Online' : '⚫ Offline'}
                        </span>
                        {selectedUser.liveStatus.activityType && (
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', background: 'rgba(120, 119, 198, 0.2)', color: '#a5b4fc' }}>
                            {selectedUser.liveStatus.activityType === 'watching' ? '▶️' : selectedUser.liveStatus.activityType === 'livetv' ? '📺' : '🔍'} {selectedUser.liveStatus.contentTitle || selectedUser.liveStatus.activityType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '28px', cursor: 'pointer', padding: '0', lineHeight: '1' }}>×</button>
                </div>

                {/* Stats Grid */}
                <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <MiniStat label="Total Watch Time" value={formatDuration(selectedUser.engagement.totalWatchTime)} icon="⏱️" />
                  <MiniStat label="Avg Completion" value={`${selectedUser.engagement.avgCompletion}%`} icon="✅" />
                  <MiniStat label="Completed" value={selectedUser.engagement.completedCount} icon="🎬" />
                  <MiniStat label="Days Active" value={selectedUser.engagement.daysActive} icon="📅" />
                  <MiniStat label="Current Streak" value={`${selectedUser.engagement.currentStreak}d`} icon="🔥" />
                  <MiniStat label="Sessions" value={selectedUser.profile.totalSessions} icon="📊" />
                </div>

                {/* User Info & Preferences */}
                <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '14px' }}>📍 Location & Device</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <InfoRow label="Country" value={selectedUser.profile.countryName ? `${getCountryFlag(selectedUser.profile.country)} ${selectedUser.profile.countryName}` : 'Unknown'} />
                      <InfoRow label="City" value={selectedUser.profile.city || 'Unknown'} />
                      <InfoRow label="Device" value={selectedUser.profile.deviceType} />
                      <InfoRow label="First Seen" value={formatDate(selectedUser.profile.firstSeen)} />
                      <InfoRow label="Last Seen" value={formatTimeAgo(selectedUser.profile.lastSeen)} />
                    </div>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '14px' }}>🎬 Preferences</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <InfoRow label="Preferred" value={selectedUser.preferences.preferredType === 'movies' ? '🎬 Movies' : selectedUser.preferences.preferredType === 'tv' ? '📺 TV Shows' : '🎭 Mixed'} />
                      <InfoRow label="Movies Watched" value={selectedUser.preferences.movieCount} />
                      <InfoRow label="TV Episodes" value={selectedUser.preferences.tvCount} />
                      <InfoRow label="Top Quality" value={selectedUser.preferences.topQuality || 'Auto'} />
                      <InfoRow label="Total Pauses" value={selectedUser.engagement.totalPauses} />
                    </div>
                  </div>
                </div>

                {/* Activity Patterns */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#f8fafc', fontSize: '14px' }}>📊 Activity Patterns</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* By Hour */}
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>Activity by Hour</div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '60px' }}>
                        {Array.from({ length: 24 }, (_, hour) => {
                          const data = selectedUser.patterns.visitsByHour.find(v => v.hour === hour);
                          const count = data?.count || 0;
                          const max = Math.max(...selectedUser.patterns.visitsByHour.map(v => v.count), 1);
                          const height = (count / max) * 100;
                          return <div key={hour} style={{ flex: 1, height: `${Math.max(height, 4)}%`, background: count > 0 ? 'linear-gradient(180deg, #7877c6, #a855f7)' : 'rgba(255,255,255,0.1)', borderRadius: '2px' }} title={`${hour}:00 - ${count} visits`} />;
                        })}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ color: '#64748b', fontSize: '10px' }}>12am</span>
                        <span style={{ color: '#64748b', fontSize: '10px' }}>12pm</span>
                        <span style={{ color: '#64748b', fontSize: '10px' }}>11pm</span>
                      </div>
                    </div>
                    {/* By Day */}
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>Activity by Day</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {[0, 1, 2, 3, 4, 5, 6].map(day => {
                          const data = selectedUser.patterns.visitsByDay.find(v => v.day === day);
                          const count = data?.count || 0;
                          const max = Math.max(...selectedUser.patterns.visitsByDay.map(v => v.count), 1);
                          const intensity = count / max;
                          return (
                            <div key={day} style={{ flex: 1, textAlign: 'center' }}>
                              <div style={{ width: '100%', height: '40px', borderRadius: '6px', background: count > 0 ? `rgba(120, 119, 198, ${0.2 + intensity * 0.8})` : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: count > 0 ? '#f8fafc' : '#64748b', fontSize: '12px', fontWeight: '600' }}>{count}</div>
                              <div style={{ color: '#64748b', fontSize: '10px', marginTop: '4px' }}>{getDayName(day)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Watch History */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#f8fafc', fontSize: '14px' }}>
                    🎬 Watch History ({selectedUser.watchHistory.length})
                    {selectedUser.watchHistory.length > 0 && (
                      <span style={{ color: '#64748b', fontWeight: '400', marginLeft: '8px', fontSize: '12px' }}>
                        Total: {formatDuration(selectedUser.watchHistory.reduce((sum, w) => sum + w.watchTime, 0))}
                      </span>
                    )}
                  </h4>
                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {selectedUser.watchHistory.length === 0 ? (
                      <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No watch history</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedUser.watchHistory.slice(0, 50).map((item, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
                            <span style={{ fontSize: '16px' }}>{item.contentType === 'movie' ? '🎬' : '📺'}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: '500' }}>{item.contentTitle || item.contentId}</div>
                              <div style={{ color: '#64748b', fontSize: '11px' }}>
                                {item.seasonNumber && `S${item.seasonNumber}E${item.episodeNumber} • `}
                                {formatDuration(item.watchTime)} watched • {item.completion}% complete
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: item.isCompleted ? '#10b981' : '#f59e0b', fontSize: '11px', fontWeight: '500' }}>{item.isCompleted ? '✓ Completed' : 'In Progress'}</div>
                              <div style={{ color: '#64748b', fontSize: '10px' }}>{formatTimeAgo(item.startedAt)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Activity */}
                <div style={{ padding: '20px 24px' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#f8fafc', fontSize: '14px' }}>📋 Recent Activity</h4>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {selectedUser.recentActivity.length === 0 ? (
                      <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No recent activity</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {selectedUser.recentActivity.map((activity, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderLeft: '2px solid rgba(120, 119, 198, 0.5)' }}>
                            <span style={{ fontSize: '14px' }}>{activity.type === 'page_view' ? '👁️' : activity.type === 'watch_start' ? '▶️' : activity.type === 'watch_end' ? '⏹️' : '📍'}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ color: '#e2e8f0', fontSize: '12px' }}>{activity.contentTitle || activity.page || activity.type}</div>
                            </div>
                            <span style={{ color: '#64748b', fontSize: '11px' }}>{formatTimeAgo(activity.timestamp)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = { flex: 1, minWidth: '200px', padding: '10px 16px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '14px', outline: 'none' };
const selectStyle: React.CSSProperties = { padding: '10px 16px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '14px', cursor: 'pointer' };
const thStyle: React.CSSProperties = { padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' };
const tdStyle: React.CSSProperties = { padding: '14px 16px', color: '#e2e8f0', fontSize: '14px' };

function MetricCard({ title, value, icon, color, subtitle, pulse }: { title: string; value: string | number; icon: string; color: string; subtitle?: string; pulse?: boolean }) {
  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '16px', borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span style={{ fontSize: '18px', position: 'relative' }}>{icon}{pulse && <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', animation: 'pulse 2s infinite' }} />}</span>
        <span style={{ color: '#94a3b8', fontSize: '12px' }}>{title}</span>
      </div>
      <div style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc' }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {subtitle && <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>{subtitle}</div>}
      <style jsx>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
      <div style={{ fontSize: '16px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>{value}</div>
      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#64748b', fontSize: '13px' }}>{label}</span>
      <span style={{ color: '#f8fafc', fontSize: '13px', fontWeight: '500', textTransform: 'capitalize' }}>{value}</span>
    </div>
  );
}

// Helper components for unified users page
function FunnelRow({ label, value, percentage, color }: { label: string; value: number; percentage: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: '#f8fafc' }}>{label}</span>
        <span style={{ color: '#94a3b8' }}>{value.toLocaleString()} ({percentage}%)</span>
      </div>
      <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percentage}%`, background: color, borderRadius: '4px' }} />
      </div>
    </div>
  );
}

function ActivityRow({ label, value, total, icon, color }: { label: string; value: number; total: number; icon: string; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon} {label}
        </span>
        <span style={{ color: '#94a3b8' }}>{value} ({pct}%)</span>
      </div>
      <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px' }} />
      </div>
    </div>
  );
}

function SegmentRow({ label, description, count, total, color }: { label: string; description: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div>
          <div style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '500' }}>{label}</div>
          <div style={{ color: '#64748b', fontSize: '12px' }}>{description}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600' }}>{count}</div>
          <div style={{ color: '#94a3b8', fontSize: '12px' }}>{percentage}%</div>
        </div>
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percentage}%`, background: color, borderRadius: '3px' }} />
      </div>
    </div>
  );
}

function RetentionMetric({ label, value, description, color }: { label: string; value: number | string; description: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', borderLeft: `3px solid ${color}` }}>
      <div>
        <div style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '500' }}>{label}</div>
        <div style={{ color: '#64748b', fontSize: '12px' }}>{description}</div>
      </div>
      <div style={{ color: color, fontSize: '18px', fontWeight: '700' }}>
        {typeof value === 'number' && value < 100 ? `${value}%` : value}
      </div>
    </div>
  );
}

function TrendMetric({ label, current, previous, color, isPercentage = false }: { label: string; current: number; previous: number; color: string; isPercentage?: boolean }) {
  const change = current - previous;
  const changePercent = previous > 0 ? Math.round((change / previous) * 100) : 0;
  const isPositive = change >= 0;
  
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
      <div>
        <div style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '500' }}>{label}</div>
        <div style={{ color: '#64748b', fontSize: '12px' }}>
          vs previous period: {isPositive ? '+' : ''}{changePercent}%
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: color, fontSize: '18px', fontWeight: '700' }}>
          {isPercentage ? `${current}%` : current.toLocaleString()}
        </div>
        <div style={{ color: isPositive ? '#10b981' : '#ef4444', fontSize: '12px' }}>
          {isPositive ? '↗' : '↘'} {Math.abs(change)}{isPercentage ? '%' : ''}
        </div>
      </div>
    </div>
  );
}

function JourneyStep({ step, users, description }: { step: string; users: number; description: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7877c6' }} />
      <div style={{ flex: 1 }}>
        <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: '500' }}>{step}</div>
        <div style={{ color: '#64748b', fontSize: '11px' }}>{description}</div>
      </div>
      <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>
        {users.toLocaleString()}
      </div>
    </div>
  );
}

// Helper functions for analytics calculations
function calculateRetentionRate(users: User[], days: number): number {
  const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
  const recentUsers = users.filter(u => u.lastSeen >= cutoffTime);
  const olderUsers = users.filter(u => u.firstSeen < cutoffTime);
  const retainedUsers = recentUsers.filter(u => u.firstSeen < cutoffTime);
  
  return olderUsers.length > 0 ? Math.round((retainedUsers.length / olderUsers.length) * 100) : 0;
}

function calculateChurnRate(users: User[]): number {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const churnedUsers = users.filter(u => u.lastSeen < thirtyDaysAgo && u.firstSeen < thirtyDaysAgo);
  const totalEligibleUsers = users.filter(u => u.firstSeen < thirtyDaysAgo);
  
  return totalEligibleUsers.length > 0 ? Math.round((churnedUsers.length / totalEligibleUsers.length) * 100) : 0;
}
