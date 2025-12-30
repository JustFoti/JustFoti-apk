# D1 Database Optimization - Memory-First Architecture

## Problem
The analytics system was causing 15-20 billion D1 reads in 2 days due to:
- Every heartbeat (every 30s) triggering 5-9 D1 queries
- Hundreds of concurrent users × frequent heartbeats = massive D1 usage
- No caching or batching of database operations

## Solution: Memory-First Architecture

The Cloudflare Worker now uses a **memory-first architecture** where:

1. **All tracking data stored in memory first** (instant, no D1 cost)
2. **Periodic batch flush to D1 every 30 seconds** (regardless of user count)
3. **GET requests served from memory** (instant, no D1 reads for real-time)
4. **D1 only used for persistence and historical queries** (cached for 30s)

## D1 Usage Estimate (New Architecture)

### With 500 concurrent users:
- **Heartbeats**: 0 D1 operations (memory only)
- **Batch flushes**: ~2 per minute × 60 min × 24 hr = **~2,880 batch operations/day**
- **Historical stats**: Cached for 30s, ~4 queries per cache miss
- **Total**: ~3,000-5,000 D1 operations/day (vs 15+ billion before)

### Reduction: **99.99%+ fewer D1 operations**

## Architecture Details

### In-Memory State
```typescript
// Live users map - keyed by userId
const liveUsers = new Map<string, LiveUser>();

// Pending writes queue
const pendingPageViews: PendingPageView[] = [];
const pendingWatchSessions = new Map<string, PendingWatchSession>();
```

### Flush Logic
- Flushes to D1 every 30 seconds (configurable)
- Uses D1 batch operations for efficiency
- Non-blocking (runs in background)
- Handles all pending data in single batch

### Endpoints
| Endpoint | Method | D1 Usage |
|----------|--------|----------|
| `/presence` | POST | **0** (memory only) |
| `/page-view` | POST | **0** (queued for batch) |
| `/watch-session` | POST | **0** (queued for batch) |
| `/live-activity` | GET | **0** (from memory) |
| `/unified-stats` | GET | **4** (cached 30s) |
| `/flush` | POST | **1 batch** (admin only) |

## Client-Side Changes

The PresenceProvider now uses:
- **30s heartbeat interval** (can be frequent since memory-only)
- **10s minimum gap** between heartbeats
- **3 minute inactivity timeout**

## Deployment

1. Deploy the updated worker:
```bash
cd cf-analytics-worker
wrangler deploy
```

2. Initialize the database (if needed):
```bash
curl -X POST https://your-worker.workers.dev/init-db
```

3. Verify health:
```bash
curl https://your-worker.workers.dev/health
```

## Monitoring

Check worker health at `/health`:
```json
{
  "status": "ok",
  "architecture": "memory-first",
  "liveUsers": 150,
  "pendingPageViews": 45,
  "pendingWatchSessions": 23,
  "lastFlush": 1703847600000,
  "timestamp": 1703847630000
}
```

Debug endpoint at `/debug` shows full memory state.

## Important Notes

1. **Worker restarts**: Memory is cleared on worker restart. This is acceptable because:
   - Data is flushed to D1 every 30s
   - Real-time stats rebuild quickly from new heartbeats
   - Historical data is preserved in D1

2. **Scaling**: Cloudflare Workers are stateless per-isolate. For very high traffic:
   - Consider Durable Objects for shared state
   - Or accept that each isolate has its own memory (still much better than D1 per-request)

3. **Free tier limits**: 
   - Workers: 100k requests/day (plenty for heartbeats)
   - D1: 5M reads, 100k writes/day (now easily within limits)
