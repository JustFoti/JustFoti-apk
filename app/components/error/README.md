# Error Handling and Resilience System

Comprehensive error handling system with retry logic, offline detection, and graceful fallbacks.

## Components

### ErrorBoundary

React error boundary for catching and handling component errors.

```tsx
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

// Global error boundary (full page)
<ErrorBoundary level="global">
  <App />
</ErrorBoundary>

// Route-level error boundary
<ErrorBoundary level="route">
  <Page />
</ErrorBoundary>

// Component-level error boundary
<ErrorBoundary level="component">
  <Widget />
</ErrorBoundary>

// Custom fallback
<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={reset}>Try Again</button>
    </div>
  )}
  onError={(error, errorInfo) => {
    // Log to error tracking service
    console.error(error, errorInfo);
  }}
>
  <Component />
</ErrorBoundary>
```

### ErrorDisplay

Reusable component for displaying API errors.

```tsx
import { ErrorDisplay } from '@/components/error/ErrorDisplay';

// Inline error (default)
<ErrorDisplay
  error={error}
  onRetry={handleRetry}
  showDetails={process.env.NODE_ENV === 'development'}
/>

// Banner error (top of page)
<ErrorDisplay
  error={error}
  variant="banner"
  onRetry={handleRetry}
  onDismiss={handleDismiss}
/>

// Modal error
<ErrorDisplay
  error={error}
  variant="modal"
  onRetry={handleRetry}
  onDismiss={handleDismiss}
/>
```

### OfflineIndicator

Shows a banner when the user goes offline.

```tsx
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';

// Add to root layout
<OfflineIndicator />
```

### FallbackImage

Image component with automatic fallback handling.

```tsx
import { FallbackImage, PosterImage, BackdropImage } from '@/components/ui/FallbackImage';

// Basic usage
<FallbackImage
  src="/image.jpg"
  alt="Description"
  width={300}
  height={450}
  fallbackType="placeholder"
/>

// Poster image (optimized for movie posters)
<PosterImage
  src={posterUrl}
  alt={title}
  priority={true}
/>

// Backdrop image (optimized for hero images)
<BackdropImage
  src={backdropUrl}
  alt={title}
/>
```

## Utilities

### API Client

Enhanced API client with error handling, retry logic, and caching.

```tsx
import { apiClient } from '@/lib/utils/api-client';

// GET request with caching
const data = await apiClient.get('/api/content/trending');

// POST request
const result = await apiClient.post('/api/analytics/track', {
  event: 'page_view',
  page: '/home',
});

// Custom configuration
const data = await apiClient.get('/api/content/search', {
  timeout: 5000,
  cache: false,
  retry: {
    maxAttempts: 5,
    initialDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2,
  },
  onError: (error) => {
    console.error('API Error:', error);
  },
});

// Invalidate cache
apiClient.invalidateCache('/api/content/trending');

// Clear all cache
apiClient.clearCache();
```

### Error Handler

Low-level error handling utilities.

```tsx
import {
  retryWithBackoff,
  fetchWithTimeout,
  parseError,
  APIErrorHandler,
} from '@/lib/utils/error-handler';

// Retry with exponential backoff
const data = await retryWithBackoff(
  async () => {
    const response = await fetch('/api/data');
    return response.json();
  },
  {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  }
);

// Fetch with timeout
const response = await fetchWithTimeout('/api/data', {}, 5000);

// Parse error
try {
  await fetch('/api/data');
} catch (error) {
  const apiError = parseError(error);
  console.error(apiError.message);
}

// Use error handler class
const data = await APIErrorHandler.executeWithRetry(
  async () => {
    const response = await fetch('/api/data');
    return response.json();
  }
);
```

### Offline Manager

Handles offline detection and request queuing.

```tsx
import { offlineManager, useOfflineDetection } from '@/lib/utils/offline-manager';

// Check if offline
const isOffline = offlineManager.getIsOffline();

// Queue a request
offlineManager.queueRequest('/api/analytics/track', {
  method: 'POST',
  body: JSON.stringify({ event: 'click' }),
});

// Subscribe to offline state changes
const unsubscribe = offlineManager.subscribe((isOffline) => {
  console.log('Offline:', isOffline);
});

// React hook
function MyComponent() {
  const isOffline = useOfflineDetection();
  
  return (
    <div>
      {isOffline ? 'You are offline' : 'You are online'}
    </div>
  );
}
```

### SWR Cache

Stale-while-revalidate caching strategy.

```tsx
import { swrCache, useSWR } from '@/lib/utils/swr-cache';

// Manual usage
const data = await swrCache.get(
  'trending-movies',
  async () => {
    const response = await fetch('/api/content/trending');
    return response.json();
  },
  {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleTime: 60 * 1000, // 1 minute
  }
);

// React hook
function TrendingMovies() {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    'trending-movies',
    async () => {
      const response = await fetch('/api/content/trending');
      return response.json();
    },
    {
      ttl: 5 * 60 * 1000,
      staleTime: 60 * 1000,
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.map(movie => <MovieCard key={movie.id} movie={movie} />)}
      <button onClick={() => mutate()}>Refresh</button>
    </div>
  );
}
```

## Best Practices

### 1. Use Error Boundaries

Wrap your app with error boundaries at different levels:

```tsx
// app/layout.tsx
<ErrorBoundary level="global">
  <html>
    <body>
      <OfflineIndicator />
      {children}
    </body>
  </html>
</ErrorBoundary>

// app/(routes)/page.tsx
<ErrorBoundary level="route">
  <HomePage />
</ErrorBoundary>

// Complex component
<ErrorBoundary level="component">
  <ComplexWidget />
</ErrorBoundary>
```

### 2. Use API Client for All Requests

Replace direct `fetch` calls with the API client:

```tsx
// ❌ Don't
const response = await fetch('/api/data');
const data = await response.json();

// ✅ Do
const data = await apiClient.get('/api/data');
```

### 3. Handle Errors Gracefully

Always provide user-friendly error messages and recovery options:

```tsx
function MyComponent() {
  const [error, setError] = useState(null);

  const handleRetry = async () => {
    setError(null);
    try {
      const data = await apiClient.get('/api/data');
      // Handle success
    } catch (err) {
      setError(err);
    }
  };

  if (error) {
    return <ErrorDisplay error={error} onRetry={handleRetry} />;
  }

  return <div>Content</div>;
}
```

### 4. Use Fallback Images

Always use FallbackImage for external images:

```tsx
// ❌ Don't
<Image src={posterUrl} alt={title} width={300} height={450} />

// ✅ Do
<FallbackImage
  src={posterUrl}
  alt={title}
  width={300}
  height={450}
  fallbackType="placeholder"
/>
```

### 5. Show Offline State

Add the offline indicator to your root layout:

```tsx
// app/layout.tsx
<body>
  <OfflineIndicator />
  {children}
</body>
```

## Error Types

### APIError

```typescript
interface APIError {
  code: string;           // Error code (e.g., 'NETWORK_ERROR', '404')
  message: string;        // User-friendly error message
  statusCode: number;     // HTTP status code
  retryable: boolean;     // Whether the error can be retried
}
```

### Common Error Codes

- `NETWORK_ERROR`: Network request failed
- `TIMEOUT`: Request timed out
- `OFFLINE`: User is offline
- `400`: Bad request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not found
- `429`: Too many requests
- `500`: Server error
- `502`: Bad gateway
- `503`: Service unavailable
- `504`: Gateway timeout

## Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { ErrorDisplay } from '@/components/error/ErrorDisplay';

// Test error boundary
test('catches errors and shows fallback', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});

// Test error display
test('shows error message and retry button', () => {
  const error = {
    code: 'NETWORK_ERROR',
    message: 'Network request failed',
    statusCode: 0,
    retryable: true,
  };

  const handleRetry = jest.fn();

  render(<ErrorDisplay error={error} onRetry={handleRetry} />);

  expect(screen.getByText(/network request failed/i)).toBeInTheDocument();
  
  const retryButton = screen.getByText(/retry/i);
  fireEvent.click(retryButton);
  
  expect(handleRetry).toHaveBeenCalled();
});
```

## Performance Considerations

1. **Error boundaries** don't impact performance when no errors occur
2. **Offline detection** uses native browser events (minimal overhead)
3. **SWR cache** reduces API calls and improves perceived performance
4. **Request deduplication** prevents duplicate requests
5. **Exponential backoff** prevents overwhelming the server during issues

## Browser Support

- Error boundaries: All modern browsers
- Offline detection: All browsers with `navigator.onLine`
- SWR caching: All browsers with localStorage
- Fetch with timeout: All browsers with AbortController

## Migration Guide

### From Direct Fetch

```tsx
// Before
const response = await fetch('/api/data');
if (!response.ok) {
  throw new Error('Request failed');
}
const data = await response.json();

// After
const data = await apiClient.get('/api/data');
```

### From Try-Catch

```tsx
// Before
try {
  const data = await fetchData();
  setData(data);
} catch (error) {
  setError(error.message);
}

// After
const { data, error } = useSWR('data-key', fetchData);
```

### From Manual Retry

```tsx
// Before
let retries = 0;
while (retries < 3) {
  try {
    const data = await fetchData();
    return data;
  } catch (error) {
    retries++;
    await sleep(1000 * retries);
  }
}

// After
const data = await retryWithBackoff(fetchData);
```
