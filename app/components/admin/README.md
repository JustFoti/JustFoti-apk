# Admin Dashboard Components

This directory contains all components used in the admin dashboard for displaying analytics and metrics.

## Components

### MetricsCard
Displays a single metric with value, trend indicator, and icon.

**Props:**
- `title`: Metric title
- `value`: Metric value (number or string)
- `change`: Percentage change (optional)
- `trend`: 'up' | 'down' | 'neutral' (optional)
- `icon`: Emoji or icon (optional)
- `suffix`: Value suffix like 'hrs' (optional)
- `loading`: Show skeleton loader (optional)

**Example:**
```tsx
<MetricsCard
  title="Active Users"
  value={42}
  change={12.5}
  trend="up"
  icon="👥"
/>
```

### TopContent
Displays a list of top watched content with stats.

**Props:**
- `items`: Array of content items with stats
- `loading`: Show skeleton loader (optional)

**Example:**
```tsx
<TopContent
  items={[
    {
      contentId: '123',
      title: 'Movie Title',
      contentType: 'movie',
      viewCount: 1500,
      totalWatchTime: 180000,
      completionRate: 0.85,
      posterPath: '/path/to/poster.jpg'
    }
  ]}
/>
```

### LiveSessions
Displays real-time active user sessions.

**Props:**
- `sessions`: Array of active sessions
- `loading`: Show skeleton loader (optional)
- `autoRefresh`: Enable auto-refresh (optional)
- `refreshInterval`: Refresh interval in ms (optional, default: 30000)

**Example:**
```tsx
<LiveSessions
  sessions={[
    {
      sessionId: 'abc-123',
      lastActivity: Date.now(),
      currentContent: {
        title: 'Movie Title',
        contentType: 'movie'
      },
      eventsCount: 15
    }
  ]}
  autoRefresh={true}
/>
```

### UsageChart
Displays engagement trends as a chart.

**Props:**
- `data`: Array of data points with timestamp and value
- `type`: 'line' | 'bar' | 'area' (optional, default: 'line')
- `title`: Chart title
- `metric`: 'views' | 'watchTime' | 'users'
- `loading`: Show skeleton loader (optional)

**Example:**
```tsx
<UsageChart
  data={[
    { timestamp: Date.now(), value: 100 },
    { timestamp: Date.now() + 3600000, value: 150 }
  ]}
  title="Engagement Trends"
  metric="views"
  type="line"
/>
```

### DateRangeFilter
Allows filtering dashboard data by date range.

**Props:**
- `value`: Current selected range ('24h' | '7d' | '30d' | '90d')
- `onChange`: Callback when range changes

**Example:**
```tsx
<DateRangeFilter
  value="7d"
  onChange={(range) => console.log('Selected:', range)}
/>
```

## Styling

All components use CSS Modules for styling with a futuristic glassmorphism design:
- Semi-transparent backgrounds with backdrop blur
- Smooth transitions and hover effects
- Responsive layouts for mobile and desktop
- Skeleton loaders for loading states

## Integration

The dashboard components are integrated in `app/admin/DashboardClient.tsx` which:
1. Fetches metrics from `/api/analytics/metrics`
2. Displays overview metrics in MetricsCard components
3. Shows engagement trends in UsageChart
4. Lists top content in TopContent
5. Displays live sessions in LiveSessions
6. Allows date range filtering with DateRangeFilter

## API Integration

The dashboard fetches data from:
- `GET /api/analytics/metrics?range={24h|7d|30d|90d}` - Returns all dashboard metrics

Response format:
```json
{
  "overview": {
    "activeUsers": 42,
    "totalViews": 1500,
    "totalWatchTime": 180000,
    "avgSessionDuration": 1200
  },
  "topContent": [...],
  "liveSessions": [...],
  "trends": [...]
}
```

## Requirements Covered

This implementation satisfies the following requirements:
- **14.1**: Real-time active user count display
- **14.2**: Top watched content section
- **14.3**: Engagement trends visualization
- **14.4**: Date range filtering capabilities
