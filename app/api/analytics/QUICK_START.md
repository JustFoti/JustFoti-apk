# Analytics API - Quick Start Guide

Get started with the analytics API in 5 minutes.

## 1. Track Events (Client-Side)

Use the analytics service to track user events:

```typescript
import { analyticsService } from '@/lib/services/analytics';

// Track page view
analyticsService.trackPageView('/home');

// Track search
analyticsService.trackSearch('action movies', 25);

// Track content view
analyticsService.trackContentView('12345', 'movie', 'The Matrix');

// Track video playback
analyticsService.trackPlay('12345', 'movie', 0, 7200, '1080p');
analyticsService.trackPause('12345', 'movie', 120, 7200, '1080p');
analyticsService.trackComplete('12345', 'movie', 7200, 7200, '1080p');
```

Events are automatically batched and sent to `/api/analytics/track`.

## 2. Fetch Dashboard Metrics (Admin)

Retrieve metrics for the admin dashboard:

```typescript
// Get metrics for last 7 days
const response = await fetch('/api/analytics/metrics?range=7d', {
  headers: {
    'Authorization': `Bearer ${authToken}`,
  },
});

const metrics = await response.json();

console.log('Active users:', metrics.overview.activeUsers);
console.log('Total views:', metrics.overview.totalViews);
console.log('Top content:', metrics.topContent);
```

## 3. Fetch Detailed Analytics (Admin)

Get detailed analytics including completion rates and peak hours:

```typescript
const response = await fetch('/api/analytics/detailed?range=30d', {
  headers: {
    'Authorization': `Bearer ${authToken}`,
  },
});

const analytics = await response.json();

console.log('Completion rates:', analytics.completionRates);
console.log('Peak hours:', analytics.peakUsageHours);
console.log('Drop-off analysis:', analytics.dropOffAnalysis);
console.log('Retention:', analytics.retentionMetrics);
```

## 4. Export Data (Admin)

Export analytics data for external analysis:

```typescript
// Export as CSV
const response = await fetch(
  '/api/analytics/export?format=csv&type=events',
  {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  }
);

const blob = await response.blob();
const url = URL.createObjectURL(blob);

// Create download link
const a = document.createElement('a');
a.href = url;
a.download = 'analytics-events.csv';
a.click();
```

## 5. React Hook Integration

Use the analytics hook in your components:

```typescript
import { useAnalytics } from '@/lib/hooks/useAnalytics';

function VideoPlayer({ contentId, contentType }) {
  const analytics = useAnalytics();
  
  const handlePlay = () => {
    analytics.trackPlay(contentId, contentType, 0, duration, quality);
  };
  
  const handlePause = () => {
    analytics.trackPause(contentId, contentType, currentTime, duration, quality);
  };
  
  return (
    <video onPlay={handlePlay} onPause={handlePause}>
      {/* ... */}
    </video>
  );
}
```

## API Endpoints Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/analytics/track` | POST | No | Track events (batch) |
| `/api/analytics/metrics` | GET | Yes | Dashboard metrics |
| `/api/analytics/detailed` | GET | Yes | Detailed analytics |
| `/api/analytics/export` | GET | Yes | Export data |

## Rate Limits

- **Track endpoint:** 100 requests/minute per IP
- **Other endpoints:** No rate limit (requires auth)

## Event Types

- `page_view` - Page navigation
- `search` - Search query
- `content_view` - Content details viewed
- `play` - Video playback started
- `pause` - Video playback paused
- `seek` - Video seek operation
- `complete` - Video playback completed

## Time Ranges

All analytics endpoints support these time ranges:
- `24h` - Last 24 hours
- `7d` - Last 7 days (default)
- `30d` - Last 30 days
- `90d` - Last 90 days

## Error Handling

```typescript
try {
  const response = await fetch('/api/analytics/metrics?range=7d', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('Error:', error.error.message);
    return;
  }
  
  const metrics = await response.json();
  // Use metrics...
} catch (error) {
  console.error('Network error:', error);
}
```

## Privacy Controls

```typescript
// Opt out of analytics
analyticsService.optOut();

// Opt back in
analyticsService.optIn();

// Check opt-out status
if (analyticsService.isOptedOut()) {
  console.log('User has opted out');
}
```

## Testing

Test the analytics API:

```bash
# Run analytics API tests
bun test app/api/analytics/__tests__/

# Test event tracking
curl -X POST http://localhost:3000/api/analytics/track \
  -H "Content-Type: application/json" \
  -d '{"events":[{"id":"uuid","sessionId":"uuid","timestamp":1699000000000,"eventType":"page_view","metadata":{"path":"/"}}]}'

# Test metrics (requires auth)
curl http://localhost:3000/api/analytics/metrics?range=7d \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Next Steps

- Read the [full API documentation](./README.md)
- Explore [analytics service implementation](../../lib/services/analytics.ts)
- Check out [database queries](../../lib/db/queries.ts)
- Review [validation schemas](../../lib/validation/analytics-schemas.ts)
