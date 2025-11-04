# Error Handling Quick Start Guide

Get started with the error handling system in 5 minutes.

## 1. Add Global Error Boundary

Wrap your app with the global error boundary in `app/layout.tsx`:

```tsx
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

## 2. Replace Fetch with API Client

Replace all `fetch` calls with the API client:

```tsx
// Before
const response = await fetch('/api/content/trending');
const data = await response.json();

// After
import { apiClient } from '@/lib/utils/api-client';
const data = await apiClient.get('/api/content/trending');
```

## 3. Handle Errors in Components

Use ErrorDisplay to show errors:

```tsx
import { ErrorDisplay } from '@/components/error/ErrorDisplay';
import { apiClient } from '@/lib/utils/api-client';

function MyComponent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const result = await apiClient.get('/api/data');
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    }
  };

  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchData} />;
  }

  return <div>{/* Your content */}</div>;
}
```

## 4. Use Fallback Images

Replace Next.js Image with FallbackImage:

```tsx
// Before
import Image from 'next/image';
<Image src={posterUrl} alt={title} width={300} height={450} />

// After
import { FallbackImage } from '@/components/ui/FallbackImage';
<FallbackImage
  src={posterUrl}
  alt={title}
  width={300}
  height={450}
  fallbackType="placeholder"
/>
```

## 5. Use SWR for Data Fetching (Optional)

For automatic caching and revalidation:

```tsx
import { useSWR } from '@/lib/utils/swr-cache';

function MyComponent() {
  const { data, error, isLoading } = useSWR(
    'my-data-key',
    async () => {
      const response = await fetch('/api/data');
      return response.json();
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <ErrorDisplay error={error} />;
  
  return <div>{/* Your content */}</div>;
}
```

## That's It!

Your app now has:
- ✅ Global error handling
- ✅ Automatic retry with exponential backoff
- ✅ Offline detection and queuing
- ✅ Stale-while-revalidate caching
- ✅ Image fallbacks
- ✅ User-friendly error messages

## Next Steps

- Read the [full documentation](./README.md)
- Check out [examples](./examples.tsx)
- Customize error messages
- Add error tracking service integration
