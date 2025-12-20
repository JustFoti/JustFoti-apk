'use client';

/**
 * Refactored Admin Dashboard
 * Efficient, detailed, and uses unified components
 */

import { useState } from 'react';
import { useStats } from '../context/StatsContext';
import {
  StatCard,
  MetricCard,
  Card,
  Grid,
  PageHeader,
  TabSelector,
  TimeRangeSelector,
  ProgressBar,
  LoadingState,
  LiveIndicator,
  Badge,
  formatDurationMinutes,
  formatNumber,
  formatTimeAgo,
  colors,
  gradients,
  getPercentage,
} from '../components/ui';

type DashboardTab = 'overview' | 'realtime' | 'content' | 'users';

export default function DashboardPage() {
  const { stats, loading, lastRefresh } = useStats();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [timeRange, setTimeRange] = useState('24h');

  if (loading && !stats.lastUpdated) {
    return <LoadingState message="Loading dashboard..." />;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'realtime', label: 'Real-time', icon: '🟢', count: stats.liveUsers },
    { id: 'content', label: 'Content', icon: '🎬', count: stats.totalSessions },
    { id: 'users', label: 'Users', icon: '👥', count: stats.activeToday },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Platform performance at a glance"
        icon="📈"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} options={[
              { value: '24h', label: '24h' },
              { value: '7d', label: '7d' },
              { value: '30d', label: '30d' },
            ]} />
            <LiveIndicator active={stats.liveUsers > 0} />
            <span style={{ color: colors.text.muted, fontSize: '12px' }}>
              {lastRefresh ? `Updated ${formatTimeAgo(lastRefresh.getTime())}` : ''}
            </span>
          </div>
        }
      />

      <TabSelector
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as DashboardTab)}
      />

      {activeTab === 'overview' && <OverviewTab stats={stats} />}
      {activeTab === 'realtime' && <RealtimeTab stats={stats} />}
      {activeTab === 'content' && <ContentTab stats={stats} />}
      {activeTab === 'users' && <UsersTab stats={stats} />}
    </div>
  );
}

function OverviewTab({ stats }: { stats: any }) {
  return (
    <>
      {/* Key Metrics */}
      <Grid cols="auto-fit" minWidth="180px" gap="16px">
        <StatCard title="Live Users" value={stats.liveUsers} icon="🟢" color={colors.success} pulse={stats.liveUsers > 0} />
        <StatCard title="DAU" value={stats.activeToday} icon="📊" color={colors.primary} subtitle="Active today" />
        <StatCard title="WAU" value={stats.activeThisWeek} icon="📈" color={colors.warning} subtitle="This week" />
        <StatCard title="MAU" value={stats.activeThisMonth} icon="📅" color={colors.info} subtitle="This month" />
        <StatCard title="Sessions (24h)" value={stats.totalSessions} icon="▶️" color={colors.pink} />
        <StatCard title="Watch Time" value={formatDurationMinutes(stats.totalWatchTime)} icon="⏱️" color={colors.purple} subtitle={`All time: ${formatDurationMinutes(stats.allTimeWatchTime)}`} />
        <StatCard title="Completion" value={`${stats.completionRate}%`} icon="✅" color={colors.success} />
        <StatCard title="Page Views" value={stats.pageViews} icon="👁️" color={colors.cyan} />
      </Grid>

      {/* Secondary Metrics */}
      <div style={{ marginTop: '24px' }}>
        <Grid cols={2} gap="24px">
          {/* Activity Breakdown */}
          <Card title="Current Activity" icon="🎯">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <ActivityRow label="Watching VOD" value={stats.liveWatching} total={stats.liveUsers} icon="▶️" color={colors.primary} />
              <ActivityRow label="Live TV" value={stats.liveTVViewers} total={stats.liveUsers} icon="📺" color={colors.warning} />
              <ActivityRow label="Browsing" value={stats.liveBrowsing} total={stats.liveUsers} icon="🔍" color={colors.info} />
            </div>
          </Card>

          {/* User Metrics */}
          <Card title="User Metrics" icon="👥">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <MetricRow label="Total Users" value={stats.totalUsers} />
              <MetricRow label="New Today" value={stats.newUsersToday} color={colors.success} />
              <MetricRow label="Returning" value={stats.returningUsers} color={colors.info} />
              <MetricRow 
                label="Retention Rate" 
                value={`${stats.activeToday > 0 ? Math.round((stats.returningUsers / stats.activeToday) * 100) : 0}%`} 
                color={colors.purple} 
              />
            </div>
          </Card>
        </Grid>
      </div>

      {/* Top Content & Countries */}
      <div style={{ marginTop: '24px' }}>
        <Grid cols={2} gap="24px">
          <Card title="Top Content (7d)" icon="🔥">
            {stats.topContent?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stats.topContent.slice(0, 5).map((item: any, i: number) => (
                  <div key={item.contentId} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: colors.text.muted, fontSize: '12px', width: '20px' }}>#{i + 1}</span>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ color: colors.text.primary, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.contentTitle}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <Badge color={item.contentType === 'movie' ? colors.success : colors.warning}>
                          {item.contentType}
                        </Badge>
                        <span style={{ color: colors.text.muted, fontSize: '12px' }}>
                          {item.watchCount} views
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: colors.text.muted, textAlign: 'center', padding: '20px' }}>No content data</div>
            )}
          </Card>

          <Card title="Top Countries (7d)" icon="🌍">
            {stats.topCountries?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stats.topCountries.slice(0, 5).map((country: any) => {
                  const total = stats.topCountries.reduce((sum: number, c: any) => sum + c.count, 0);
                  return (
                    <div key={country.country}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: colors.text.primary, fontSize: '14px' }}>
                          {country.countryName || country.country}
                        </span>
                        <span style={{ color: colors.text.muted, fontSize: '13px' }}>
                          {country.count} ({getPercentage(country.count, total)}%)
                        </span>
                      </div>
                      <ProgressBar value={country.count} max={total} gradient={gradients.mixed} height={6} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: colors.text.muted, textAlign: 'center', padding: '20px' }}>No geographic data</div>
            )}
          </Card>
        </Grid>
      </div>
    </>
  );
}

function RealtimeTab({ stats }: { stats: any }) {
  return (
    <>
      <Grid cols="auto-fit" minWidth="200px" gap="16px">
        <StatCard title="Total Active" value={stats.liveUsers} icon="👥" color={colors.success} pulse size="lg" />
        <StatCard title="Truly Active" value={stats.trulyActiveUsers} icon="🎯" color={colors.primary} subtitle="Last 60 seconds" />
        <StatCard title="Watching VOD" value={stats.liveWatching} icon="▶️" color={colors.purple} />
        <StatCard title="Live TV" value={stats.liveTVViewers} icon="📺" color={colors.warning} />
        <StatCard title="Browsing" value={stats.liveBrowsing} icon="🔍" color={colors.info} />
      </Grid>

      {/* Peak Stats */}
      {stats.peakStats && (
        <div style={{ marginTop: '24px' }}>
          <Card title="Today's Peak Activity" icon="📈">
            <Grid cols={4} gap="16px">
              <PeakStat label="Peak Total" value={stats.peakStats.peakTotal} time={stats.peakStats.peakTotalTime} />
              <PeakStat label="Peak Watching" value={stats.peakStats.peakWatching} time={stats.peakStats.peakWatchingTime} />
              <PeakStat label="Peak Live TV" value={stats.peakStats.peakLiveTV} time={stats.peakStats.peakLiveTVTime} />
              <PeakStat label="Peak Browsing" value={stats.peakStats.peakBrowsing} time={stats.peakStats.peakBrowsingTime} />
            </Grid>
          </Card>
        </div>
      )}

      {/* Activity Distribution */}
      <div style={{ marginTop: '24px' }}>
        <Card title="Activity Distribution" icon="📊">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <ActivityBar label="Watching VOD" value={stats.liveWatching} total={stats.liveUsers} color={colors.purple} icon="▶️" />
            <ActivityBar label="Live TV" value={stats.liveTVViewers} total={stats.liveUsers} color={colors.warning} icon="📺" />
            <ActivityBar label="Browsing" value={stats.liveBrowsing} total={stats.liveUsers} color={colors.info} icon="🔍" />
          </div>
        </Card>
      </div>
    </>
  );
}

function ContentTab({ stats }: { stats: any }) {
  return (
    <>
      <Grid cols="auto-fit" minWidth="180px" gap="16px">
        <StatCard title="Sessions (24h)" value={stats.totalSessions} icon="📊" color={colors.primary} />
        <StatCard title="Watch Time" value={formatDurationMinutes(stats.totalWatchTime)} icon="⏱️" color={colors.success} />
        <StatCard title="Avg Duration" value={`${stats.avgSessionDuration}m`} icon="📈" color={colors.warning} />
        <StatCard title="Completion" value={`${stats.completionRate}%`} icon="✅" color={colors.pink} />
        <StatCard title="Completed" value={stats.completedSessions} icon="🏆" color={colors.success} />
        <StatCard title="Unique Content" value={stats.uniqueContentWatched} icon="🎬" color={colors.purple} />
        <StatCard title="Total Pauses" value={stats.totalPauses} icon="⏸️" color={colors.info} />
        <StatCard title="Total Seeks" value={stats.totalSeeks} icon="⏩" color={colors.cyan} />
      </Grid>

      <div style={{ marginTop: '24px' }}>
        <Grid cols={2} gap="24px">
          {/* Content Type Breakdown */}
          <Card title="Content Type" icon="🎭">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <ContentTypeRow label="Movies" value={stats.movieSessions} total={stats.totalSessions} color={colors.success} icon="🎬" />
              <ContentTypeRow label="TV Shows" value={stats.tvSessions} total={stats.totalSessions} color={colors.warning} icon="📺" />
            </div>
          </Card>

          {/* Device Breakdown */}
          <Card title="Devices" icon="📱">
            {stats.deviceBreakdown?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stats.deviceBreakdown.map((device: any) => {
                  const total = stats.deviceBreakdown.reduce((sum: number, d: any) => sum + d.count, 0);
                  const icons: Record<string, string> = { desktop: '💻', mobile: '📱', tablet: '📲', unknown: '🖥️' };
                  return (
                    <div key={device.device}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: colors.text.primary, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {icons[device.device] || '🖥️'} {device.device || 'Unknown'}
                        </span>
                        <span style={{ color: colors.text.muted, fontSize: '13px' }}>
                          {device.count} ({getPercentage(device.count, total)}%)
                        </span>
                      </div>
                      <ProgressBar value={device.count} max={total} gradient={gradients.mixed} height={6} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: colors.text.muted, textAlign: 'center', padding: '20px' }}>No device data</div>
            )}
          </Card>
        </Grid>
      </div>

      {/* All-time Stats */}
      <div style={{ marginTop: '24px' }}>
        <Card title="All-Time Statistics" icon="📈">
          <Grid cols={3} gap="16px">
            <MetricCard label="Total Watch Time" value={formatDurationMinutes(stats.allTimeWatchTime)} icon="⏱️" />
            <MetricCard label="Total Users" value={stats.totalUsers} icon="👥" />
            <MetricCard label="Unique Visitors (24h)" value={stats.uniqueVisitors} icon="🧑‍💻" />
          </Grid>
        </Card>
      </div>
    </>
  );
}

function UsersTab({ stats }: { stats: any }) {
  return (
    <>
      <Grid cols="auto-fit" minWidth="180px" gap="16px">
        <StatCard title="Total Users" value={stats.totalUsers} icon="👥" color={colors.primary} size="lg" />
        <StatCard title="DAU" value={stats.activeToday} icon="📊" color={colors.success} subtitle="Daily Active" />
        <StatCard title="WAU" value={stats.activeThisWeek} icon="📈" color={colors.warning} subtitle="Weekly Active" />
        <StatCard title="MAU" value={stats.activeThisMonth} icon="📅" color={colors.info} subtitle="Monthly Active" />
        <StatCard title="New Today" value={stats.newUsersToday} icon="🆕" color={colors.success} />
        <StatCard title="Returning" value={stats.returningUsers} icon="🔄" color={colors.purple} />
      </Grid>

      <div style={{ marginTop: '24px' }}>
        <Grid cols={2} gap="24px">
          {/* User Funnel */}
          <Card title="User Funnel" icon="📊">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FunnelRow label="Total Users" value={stats.totalUsers} percentage={100} color={colors.primary} />
              <FunnelRow label="Active This Month" value={stats.activeThisMonth} percentage={getPercentage(stats.activeThisMonth, stats.totalUsers)} color={colors.info} />
              <FunnelRow label="Active This Week" value={stats.activeThisWeek} percentage={getPercentage(stats.activeThisWeek, stats.totalUsers)} color={colors.warning} />
              <FunnelRow label="Active Today" value={stats.activeToday} percentage={getPercentage(stats.activeToday, stats.totalUsers)} color={colors.success} />
              <FunnelRow label="Online Now" value={stats.liveUsers} percentage={getPercentage(stats.liveUsers, stats.totalUsers)} color={colors.pink} />
            </div>
          </Card>

          {/* Retention */}
          <Card title="Retention Metrics" icon="💪">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: colors.text.secondary }}>Daily Retention</span>
                  <span style={{ color: colors.text.primary, fontWeight: '600' }}>
                    {stats.activeToday > 0 ? Math.round((stats.returningUsers / stats.activeToday) * 100) : 0}%
                  </span>
                </div>
                <ProgressBar 
                  value={stats.returningUsers} 
                  max={stats.activeToday || 1} 
                  color={colors.success} 
                  height={10} 
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: colors.text.secondary }}>New vs Returning</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: stats.newUsersToday || 1, background: colors.success, height: '24px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'white', fontWeight: '600' }}>
                    New: {stats.newUsersToday}
                  </div>
                  <div style={{ flex: stats.returningUsers || 1, background: colors.info, height: '24px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'white', fontWeight: '600' }}>
                    Returning: {stats.returningUsers}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Grid>
      </div>
    </>
  );
}

// Helper Components
function ActivityRow({ label, value, total, icon, color }: { label: string; value: number; total: number; icon: string; color: string }) {
  const pct = getPercentage(value, total);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: colors.text.primary, fontSize: '14px' }}>{label}</span>
          <span style={{ color: colors.text.muted, fontSize: '13px' }}>{value} ({pct}%)</span>
        </div>
        <ProgressBar value={pct} max={100} color={color} height={6} />
      </div>
    </div>
  );
}

function ActivityBar({ label, value, total, color, icon }: { label: string; value: number; total: number; color: string; icon: string }) {
  const pct = getPercentage(value, total);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ color: colors.text.primary, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon} {label}
        </span>
        <span style={{ color, fontSize: '18px', fontWeight: '700' }}>{value} <span style={{ fontSize: '12px', fontWeight: '500', opacity: 0.7 }}>({pct}%)</span></span>
      </div>
      <ProgressBar value={pct} max={100} color={color} height={12} />
    </div>
  );
}

function MetricRow({ label, value, color = colors.text.primary }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: colors.text.secondary, fontSize: '14px' }}>{label}</span>
      <span style={{ color, fontSize: '18px', fontWeight: '700' }}>{typeof value === 'number' ? formatNumber(value) : value}</span>
    </div>
  );
}

function ContentTypeRow({ label, value, total, color, icon }: { label: string; value: number; total: number; color: string; icon: string }) {
  const pct = getPercentage(value, total);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ color: colors.text.primary, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon} {label}
        </span>
        <span style={{ color: colors.text.muted, fontSize: '13px' }}>{value} sessions ({pct}%)</span>
      </div>
      <ProgressBar value={value} max={total || 1} color={color} height={8} />
    </div>
  );
}

function PeakStat({ label, value, time }: { label: string; value: number; time: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: colors.text.muted, fontSize: '12px', marginBottom: '4px' }}>{label}</div>
      <div style={{ color: colors.text.primary, fontSize: '28px', fontWeight: '700' }}>{value}</div>
      <div style={{ color: colors.text.muted, fontSize: '11px', marginTop: '4px' }}>
        at {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}

function FunnelRow({ label, value, percentage, color }: { label: string; value: number; percentage: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: colors.text.primary, fontSize: '14px' }}>{label}</span>
        <span style={{ color: colors.text.muted, fontSize: '13px' }}>{formatNumber(value)} ({percentage}%)</span>
      </div>
      <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percentage}%`, background: color, borderRadius: '4px', transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}
