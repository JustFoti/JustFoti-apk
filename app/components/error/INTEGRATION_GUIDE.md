# Error Handling Integration Guide

Step-by-step guide to integrate the error handling system into Flyx 2.0.

## Step 1: Update Root Layout

Add global error boundary and offline indicator to `app/layout.js`:

```jsx
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary level="global">
          <OfflineIndicator />
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

## Step 2: Update TMDB Service

Replace fetch calls in `app/lib/services/tmdb.ts`:

```typescript
// Before
const response = await fetch(url);
const data = await response.json();

// After
import { apiClient } from '@/lib/utils/api-client';
const data = await apiClient.get(url, {
  cache: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
});
```

## Step 3: Update Extractor Service

Replace fetch calls in `app/lib/services/extractor.ts`:

```typescript
// Before
const response = await fetch(url, { timeout: 30000 });
const data = await response.json();

// After
import { apiClient } from '@/lib/utils/api-client';
const data = await apiClient.get(url, {
  timeout: 30000,
  cache: true,
  cacheTTL: 10 * 60 * 1000, // 10 minutes
});
```

## Step 4: Update Analytics Service

Add offline queuing to `app/lib/services/analytics.ts`:

```typescript
import { apiClient } from '@/lib/utils/api-client';
import { offlineManager } from '@/lib/utils/offline-manager';

export async function trackEvent(event: AnalyticsEvent) {
  try {
    await apiClient.post('/api/analytics/track', event, {
      cache: false, // Don't cache analytics
    });
  } catch (error) {
    // Event will be automatically queued if offline
    console.warn('Analytics event queued:', event);
  }
}
```

## Step 5: Update Content Components

Add error handling to content display components:

### ContentCard.tsx

```tsx
import { FallbackImage } from '@/components/ui/FallbackImage';

export function ContentCard({ item }) {
  return (
    <div className={styles.card}>
      <FallbackImage
        src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
        alt={item.title}
        fill
        fallbackType="placeholder"
        priority={false}
      />
      {/* Rest of card content */}
    </div>
  );
}
```

### ContentGrid.tsx

```tsx
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { ErrorDisplay } from '@/components/error/ErrorDisplay';

export function ContentGrid({ items }) {
  const [error, setError] = useState(null);

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => setError(null)} />;
  }

  return (
    <ErrorBoundary level="component">
      <div className={styles.grid}>
        {items.map(item => (
          <ContentCard key={item.id} item={item} />
        ))}
      </div>
    </ErrorBoundary>
  );
}
```

## Step 6: Update Page Components

Add route-level error boundaries:

### Home Page

```tsx
// app/(routes)/page.tsx
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

export default function HomePage() {
  return (
    <ErrorBoundary level="route">
      <HomePageClient />
    </ErrorBoundary>
  );
}
```

### Details Page

```tsx
// app/(routes)/details/[id]/page.tsx
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { ErrorDisplay } from '@/components/error/ErrorDisplay';

export default function DetailsPage({ params }) {
  const [error, setError] = useState(null);

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => setError(null)} variant="banner" />;
  }

  return (
    <ErrorBoundary level="route">
      <DetailsPageClient id={params.id} />
    </ErrorBoundary>
  );
}
```

## Step 7: Update Search Component

Add error handling to search:

```tsx
// app/components/search/SearchContainer.tsx
import { ErrorDisplay } from '@/components/error/ErrorDisplay';
import { apiClient } from '@/lib/utils/api-client';

export function SearchContainer() {
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.get(`/api/content/search?q=${query}`, {
        cache: true,
        cacheTTL: 10 * 60 * 1000,
      });
      setResults(data.results);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <SearchBar onSearch={handleSearch} />
      
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={() => handleSearch(lastQuery)}
          variant="inline"
        />
      )}
      
      {loading && <LoadingSpinner />}
      {results.length > 0 && <SearchResults results={results} />}
    </div>
  );
}
```

## Step 8: Update Video Player

Add error handling to video player:

```tsx
// app/components/player/VideoPlayer.tsx
import { ErrorDisplay } from '@/components/error/ErrorDisplay';
import { apiClient } from '@/lib/utils/api-client';

export function VideoPlayer({ contentId }) {
  const [streamUrl, setStreamUrl] = useState(null);
  const [error, setError] = useState(null);

  const loadStream = async () => {
    setError(null);
    
    try {
      const data = await apiClient.post('/api/stream/extract', {
        contentId,
      }, {
        timeout: 30000,
        cache: true,
        cacheTTL: 10 * 60 * 1000,
      });
      setStreamUrl(data.streamUrl);
    } catch (err) {
      setError(err);
    }
  };

  useEffect(() => {
    loadStream();
  }, [contentId]);

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={loadStream}
        variant="inline"
      />
    );
  }

  return streamUrl ? <VideoPlayerCore src={streamUrl} /> : <LoadingSpinner />;
}
```

## Step 9: Update API Routes

Add error handling to API routes:

```typescript
// app/api/content/trending/route.ts
import { NextResponse } from 'next/server';
import { parseError } from '@/lib/utils/error-handler';

export async function GET() {
  try {
    const data = await getTrendingContent();
    return NextResponse.json(data);
  } catch (error) {
    const apiError = parseError(error);
    return NextResponse.json(
      { error: apiError.message },
      { status: apiError.statusCode }
    );
  }
}
```

## Step 10: Update Admin Dashboard

Add error handling to admin components:

```tsx
// app/admin/DashboardClient.tsx
import { ErrorDisplay } from '@/components/error/ErrorDisplay';
import { useSWR } from '@/lib/utils/swr-cache';

export function DashboardClient() {
  const { data, error, isLoading, mutate } = useSWR(
    'admin-metrics',
    async () => {
      const response = await fetch('/api/analytics/metrics');
      return response.json();
    },
    {
      ttl: 60 * 1000, // 1 minute
      staleTime: 30 * 1000, // 30 seconds
    }
  );

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => mutate()}
        variant="banner"
      />
    );
  }

  if (isLoading) return <LoadingSpinner />;

  return <DashboardContent data={data} />;
}
```

## Step 11: Test Error Scenarios

### Test Offline Mode
1. Open DevTools Network tab
2. Set to "Offline"
3. Try to load content
4. Verify offline indicator appears
5. Go back online
6. Verify queued requests are processed

### Test Network Errors
1. Open DevTools Network tab
2. Set to "Slow 3G"
3. Try to load content
4. Verify loading states
5. Verify retry functionality

### Test Image Errors
1. Use invalid image URL
2. Verify fallback placeholder appears
3. Verify no broken image icons

### Test Component Errors
1. Trigger a component error
2. Verify error boundary catches it
3. Verify retry functionality
4. Verify other components still work

## Step 12: Monitor Errors

Add error tracking integration:

```typescript
// app/lib/utils/error-tracking.ts
export function logError(error: Error, errorInfo?: any) {
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  } else {
    console.error('Error:', error, errorInfo);
  }
}

// Use in ErrorBoundary
<ErrorBoundary
  onError={(error, errorInfo) => {
    logError(error, errorInfo);
  }}
>
  {children}
</ErrorBoundary>
```

## Checklist

- [ ] Root layout has global error boundary
- [ ] Root layout has offline indicator
- [ ] All fetch calls replaced with apiClient
- [ ] All images use FallbackImage
- [ ] All pages have route-level error boundaries
- [ ] All complex components have component-level error boundaries
- [ ] All API routes have error handling
- [ ] Search has error handling and retry
- [ ] Video player has error handling and retry
- [ ] Admin dashboard has error handling
- [ ] Offline mode tested
- [ ] Network errors tested
- [ ] Image errors tested
- [ ] Component errors tested
- [ ] Error tracking integrated

## Performance Tips

1. **Cache Aggressively**: Use long TTLs for static content
2. **Queue Analytics**: Don't block UI for analytics failures
3. **Prefetch Data**: Load data before user needs it
4. **Lazy Load Images**: Use FallbackImage with lazy loading
5. **Debounce Searches**: Reduce API calls during typing

## Common Issues

### Issue: Too Many Retries
**Solution**: Adjust retry configuration
```typescript
apiClient.get(url, {
  retry: {
    maxAttempts: 2,
    initialDelay: 500,
  }
});
```

### Issue: Cache Not Updating
**Solution**: Invalidate cache manually
```typescript
apiClient.invalidateCache('/api/content/trending');
```

### Issue: Offline Queue Growing
**Solution**: Clear old requests
```typescript
offlineManager.clearQueue();
```

### Issue: Images Loading Slowly
**Solution**: Use priority and optimize sizes
```tsx
<FallbackImage
  src={url}
  alt={alt}
  priority={true}
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

## Next Steps

1. Monitor error rates in production
2. Adjust retry strategies based on usage
3. Add custom error messages for specific scenarios
4. Implement error recovery analytics
5. Add user feedback for errors
6. Optimize cache strategies
7. Add error prevention (validation, etc.)

## Support

For questions or issues:
- Check [README.md](./README.md) for detailed documentation
- Review [examples.tsx](./examples.tsx) for working code
- See [QUICK_START.md](./QUICK_START.md) for basic setup
