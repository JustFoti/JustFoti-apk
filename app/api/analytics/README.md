# Analytics API Routes

Complete implementation of analytics API endpoints for event tracking, metrics retrieval, and data export.

## Overview

The analytics API provides three main functionalities:
1. **Event Tracking** - Ingest user activity events with batch processing
2. **Metrics Retrieval** - Fetch dashboard metrics and detailed analytics (requires authentication)
3. **Data Export** - Export analytics data in CSV or JSON format (requires authentication)

## Routes

### 1. POST /api/analytics/track

Track analytics events with batch processing and rate limiting.

**Authentication:** Not required (public endpoint)

**Request Body:**
```json
{
  "events": [
    {
      "id": "uuid-v4",
      "sessionId": "uuid-v4",
      "timestamp": 1699000000000,
      "eventType": "play",
      "metadata": {
        "contentId": "12345",
        "contentType": "movie",
        "currentTime": 120,
        "duration": 7200,
        "quality": "1080p"
      }
    }
  ]
}
```

**Event Types:**
- `page_view` - User navigates to a page
- `search` - User performs a search
- `content_view` - User views content details
- `play` - Video playback starts
- `pause` - Video playback pauses
- `seek` - User seeks in video
- `complete` - Video playback completes

**Rate Limiting:**
- 100 requests per minute per IP
- Returns 429 status when exceeded
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`

**Response:**
```json
{
  "success": true,
  "processed": 10
}
```

**Features:**
- Batch processing (up to 50 events per request)
- Automatic content stats updates
- Duplicate event detection
- Timestamp validation
- Rate limiting per IP

### 2. GET /api/analytics/metrics

Fetch dashboard metrics including overview, top content, live sessions, and trends.

**Authentication:** Required (JWT token)

**Query Parameters:**
- `range` - Time range: `24h`, `7d`, `30d`, `90d` (default: `7d`)

**Example:**
```
GET /api/analytics/metrics?range=7d
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "overview": {
    "activeUsers": 42,
    "totalViews": 1250,
    "totalWatchTime": 450000,
    "avgSessionDuration": 1800
  },
  "topContent": [
    {
      "contentId": "12345",
      "title": "Movie Title",
      "contentType": "movie",
      "viewCount": 150,
      "totalWatchTime": 108000,
      "completionRate": 0.85
    }
  ],
  "liveSessions": [
    {
      "sessionId": "uuid",
      "lastActivity": 1699000000000,
      "currentContent": {
        "title": "Movie Title",
        "contentType": "movie"
      },
      "eventsCount": 25
    }
  ],
  "trends": [
    {
      "timestamp": 1699000000000,
      "value": 45
    }
  ]
}
```

### 3. GET /api/analytics/detailed

Fetch detailed analytics including completion rates, peak usage hours, drop-off analysis, and retention metrics.

**Authentication:** Required (JWT token)

**Query Parameters:**
- `range` - Time range: `24h`, `7d`, `30d`, `90d` (default: `7d`)
- `timezone` - Timezone for peak hours (default: `UTC`)

**Example:**
```
GET /api/analytics/detailed?range=30d&timezone=America/New_York
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "completionRates": [
    {
      "contentId": "12345",
      "title": "Movie Title",
      "contentType": "movie",
      "completionRate": 85.5,
      "viewCount": 150,
      "avgWatchTime": 5400
    }
  ],
  "peakUsageHours": [
    {
      "hour": 20,
      "count": 245,
      "label": "20:00"
    }
  ],
  "dropOffAnalysis": [
    {
      "contentId": "12345",
      "title": "Movie Title",
      "contentType": "movie",
      "dropOffPoints": [
        {
          "timestamp": 25,
          "percentage": 15.5
        }
      ]
    }
  ],
  "retentionMetrics": {
    "dailyActiveUsers": [
      {
        "date": "2024-01-01",
        "count": 125
      }
    ],
    "avgSessionDuration": 1800,
    "returnRate": 65.5,
    "churnRate": 34.5
  }
}
```

### 4. GET /api/analytics/export

Export analytics data in CSV or JSON format.

**Authentication:** Required (JWT token)

**Query Parameters:**
- `format` - Export format: `csv`, `json` (default: `json`)
- `type` - Data type: `events`, `metrics`, `content` (default: `events`)
- `start` - Start timestamp (optional)
- `end` - End timestamp (optional)

**Example:**
```
GET /api/analytics/export?format=csv&type=events&start=1699000000000&end=1699086400000
Authorization: Bearer <jwt-token>
```

**Response:**
- CSV file download with appropriate headers
- JSON file download with formatted data

**Data Types:**
- `events` - Raw analytics events
- `metrics` - Daily aggregated metrics
- `content` - Content statistics

## Authentication

Protected routes require a valid JWT token in either:
1. Authorization header: `Authorization: Bearer <token>`
2. HTTP-only cookie: `auth_token=<token>`

To obtain a token, authenticate via `/api/auth/login`.

## Error Handling

All routes return consistent error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Invalid request parameters (400)
- `UNAUTHORIZED` - Authentication required (401)
- `RATE_LIMIT_EXCEEDED` - Too many requests (429)
- `INTERNAL_ERROR` - Server error (500)

## Rate Limiting

The `/api/analytics/track` endpoint implements rate limiting:
- **Limit:** 100 requests per minute per IP
- **Window:** 60 seconds
- **Response:** 429 status with `Retry-After` header

## Batch Processing

Event tracking supports batch processing for efficiency:
- **Max batch size:** 50 events per request
- **Benefits:** Reduced network overhead, improved database performance
- **Automatic:** Content stats updated asynchronously

## Data Validation

All requests are validated using Zod schemas:
- Event structure validation
- Timestamp range validation
- Duplicate event detection
- Type safety enforcement

## Performance Optimizations

1. **Batch Inserts** - Events inserted in single transaction
2. **Async Updates** - Content stats updated without blocking response
3. **Indexed Queries** - Database indexes for fast lookups
4. **Rate Limiting** - Prevents abuse and ensures stability
5. **Aggregated Metrics** - Pre-computed daily metrics for fast dashboard queries

## Usage Examples

### Client-Side Event Tracking

```typescript
import { analyticsService } from '@/lib/services/analytics';

// Track page view
analyticsService.trackPageView('/movies/12345');

// Track video playback
analyticsService.trackPlay('12345', 'movie', 0, 7200, '1080p');

// Manually flush events
await analyticsService.flush();
```

### Admin Dashboard Metrics

```typescript
// Fetch dashboard metrics
const response = await fetch('/api/analytics/metrics?range=7d', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const metrics = await response.json();
```

### Export Analytics Data

```typescript
// Export events as CSV
const response = await fetch(
  '/api/analytics/export?format=csv&type=events&start=1699000000000',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);

const blob = await response.blob();
const url = URL.createObjectURL(blob);
// Trigger download
```

## Database Schema

Events are stored in SQLite with the following tables:

### analytics_events
- `id` - UUID primary key
- `session_id` - Session identifier
- `timestamp` - Event timestamp (milliseconds)
- `event_type` - Type of event
- `metadata` - JSON metadata
- Indexes on: `session_id`, `timestamp`, `event_type`

### content_stats
- `content_id` - Content identifier (primary key)
- `content_type` - movie or tv
- `view_count` - Total views
- `total_watch_time` - Total watch time (seconds)
- `completion_rate` - Percentage of completions
- `avg_watch_time` - Average watch time
- `last_viewed` - Last view timestamp

### metrics_daily
- `date` - Date (primary key)
- `total_views` - Total views for day
- `total_watch_time` - Total watch time for day
- `unique_sessions` - Unique sessions for day
- `avg_session_duration` - Average session duration
- `top_content` - Top content for day

## Privacy & Compliance

- **Anonymous Sessions** - No PII collected
- **Do Not Track** - Respects DNT header
- **Opt-Out** - Users can opt out via `analyticsService.optOut()`
- **Data Retention** - Events auto-deleted after 90 days
- **GDPR Compliant** - Data export and deletion support

## Testing

Run tests with:
```bash
bun test app/api/analytics/__tests__/
```

## Related Documentation

- [Analytics Service](../../lib/services/analytics.ts)
- [Database Queries](../../lib/db/queries.ts)
- [Authentication Middleware](../../lib/middleware/auth.ts)
- [Validation Schemas](../../lib/validation/analytics-schemas.ts)
