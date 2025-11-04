/**
 * Error Handling Examples
 * Demonstrates how to use the error handling system
 */

'use client';

import React, { useState } from 'react';
import { ErrorBoundary, useErrorHandler } from './ErrorBoundary';
import { ErrorDisplay } from './ErrorDisplay';
import { FallbackImage } from '../ui/FallbackImage';
import { OfflineIndicator } from '../ui/OfflineIndicator';
import { apiClient } from '@/lib/utils/api-client';
import { useSWR } from '@/lib/utils/swr-cache';
import { useOfflineDetection } from '@/lib/utils/offline-manager';
import { APIError } from '@/types/api';

/**
 * Example 1: Basic Error Boundary Usage
 */
export function ErrorBoundaryExample() {
  const [shouldError, setShouldError] = useState(false);

  const ComponentThatErrors = () => {
    if (shouldError) {
      throw new Error('This is a test error!');
    }
    return <div>Component is working fine</div>;
  };

  return (
    <div>
      <h2>Error Boundary Example</h2>
      <button onClick={() => setShouldError(true)}>
        Trigger Error
      </button>
      
      <ErrorBoundary level="component">
        <ComponentThatErrors />
      </ErrorBoundary>
    </div>
  );
}

/**
 * Example 2: API Error Handling with Retry
 */
export function APIErrorExample() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<APIError | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.get('/api/content/trending');
      setData(result);
    } catch (err) {
      setError(err as APIError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>API Error Handling Example</h2>
      <button onClick={fetchData} disabled={loading}>
        {loading ? 'Loading...' : 'Fetch Data'}
      </button>

      {error && (
        <ErrorDisplay
          error={error}
          onRetry={fetchData}
          variant="inline"
          showDetails={true}
        />
      )}

      {data && (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}

/**
 * Example 3: SWR with Automatic Retry
 */
export function SWRExample() {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    'trending-content',
    async () => {
      const response = await fetch('/api/content/trending');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    {
      ttl: 5 * 60 * 1000, // 5 minutes
      staleTime: 60 * 1000, // 1 minute
    }
  );

  return (
    <div>
      <h2>SWR Example</h2>
      
      {isLoading && <div>Loading...</div>}
      {isValidating && <div>Revalidating...</div>}
      
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={() => mutate()}
          variant="inline"
        />
      )}

      {data && (
        <div>
          <button onClick={() => mutate()}>Refresh</button>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

/**
 * Example 4: Offline Detection
 */
export function OfflineExample() {
  const isOffline = useOfflineDetection();
  const [queuedRequests, setQueuedRequests] = useState(0);

  const makeRequest = async () => {
    try {
      await apiClient.post('/api/analytics/track', {
        event: 'button_click',
        timestamp: Date.now(),
      });
      alert('Request sent successfully!');
    } catch (error) {
      setQueuedRequests(prev => prev + 1);
      alert('Request queued for when you\'re back online');
    }
  };

  return (
    <div>
      <h2>Offline Detection Example</h2>
      <OfflineIndicator />
      
      <div style={{ marginTop: '1rem' }}>
        <p>Status: {isOffline ? '🔴 Offline' : '🟢 Online'}</p>
        <p>Queued Requests: {queuedRequests}</p>
        <button onClick={makeRequest}>
          Make API Request
        </button>
      </div>
    </div>
  );
}

/**
 * Example 5: Image Fallback
 */
export function ImageFallbackExample() {
  const [imageUrl, setImageUrl] = useState('https://image.tmdb.org/t/p/w500/valid-image.jpg');

  return (
    <div>
      <h2>Image Fallback Example</h2>
      
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button onClick={() => setImageUrl('https://image.tmdb.org/t/p/w500/valid-image.jpg')}>
          Valid Image
        </button>
        <button onClick={() => setImageUrl('https://invalid-url.com/broken.jpg')}>
          Broken Image
        </button>
      </div>

      <div style={{ width: '300px', height: '450px', marginTop: '1rem' }}>
        <FallbackImage
          src={imageUrl}
          alt="Example Image"
          width={300}
          height={450}
          fallbackType="placeholder"
        />
      </div>
    </div>
  );
}

/**
 * Example 6: Error Display Variants
 */
export function ErrorDisplayVariantsExample() {
  const [variant, setVariant] = useState<'inline' | 'banner' | 'modal'>('inline');
  const [showError, setShowError] = useState(false);

  const error: APIError = {
    code: 'NETWORK_ERROR',
    message: 'Failed to connect to the server. Please check your internet connection.',
    statusCode: 0,
    retryable: true,
  };

  return (
    <div>
      <h2>Error Display Variants</h2>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button onClick={() => { setVariant('inline'); setShowError(true); }}>
          Show Inline Error
        </button>
        <button onClick={() => { setVariant('banner'); setShowError(true); }}>
          Show Banner Error
        </button>
        <button onClick={() => { setVariant('modal'); setShowError(true); }}>
          Show Modal Error
        </button>
      </div>

      {showError && (
        <ErrorDisplay
          error={error}
          variant={variant}
          onRetry={() => alert('Retrying...')}
          onDismiss={() => setShowError(false)}
          showDetails={true}
        />
      )}
    </div>
  );
}

/**
 * Example 7: Programmatic Error Handling
 */
export function ProgrammaticErrorExample() {
  const throwError = useErrorHandler();
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(prev => prev + 1);
    
    // Throw error after 3 clicks
    if (count >= 2) {
      throwError(new Error('You clicked too many times!'));
    }
  };

  return (
    <ErrorBoundary level="component">
      <div>
        <h2>Programmatic Error Example</h2>
        <p>Clicks: {count}</p>
        <button onClick={handleClick}>
          Click Me (Error after 3 clicks)
        </button>
      </div>
    </ErrorBoundary>
  );
}

/**
 * Example 8: Complete Integration
 */
export function CompleteIntegrationExample() {
  const isOffline = useOfflineDetection();
  const { data, error, isLoading, mutate } = useSWR<{ results: any[] }>(
    isOffline ? null : 'movies',
    async () => {
      return await apiClient.get<{ results: any[] }>('/api/content/trending');
    }
  );

  return (
    <ErrorBoundary level="component">
      <div>
        <h2>Complete Integration Example</h2>
        <OfflineIndicator />

        {isOffline && (
          <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
            You&apos;re offline. Showing cached data.
          </div>
        )}

        {isLoading && <div>Loading...</div>}

        {error && (
          <ErrorDisplay
            error={error}
            onRetry={() => mutate()}
            variant="inline"
          />
        )}

        {data && data.results && (
          <div>
            <button onClick={() => mutate()}>Refresh</button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              {data.results.slice(0, 6).map((item: any) => (
                <div key={item.id} style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '300px' }}>
                    <FallbackImage
                      src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                      alt={item.title || item.name}
                      fill
                      fallbackType="placeholder"
                    />
                  </div>
                  <div style={{ padding: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.875rem' }}>
                      {item.title || item.name}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

/**
 * Demo Page Component
 */
export function ErrorHandlingDemo() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Error Handling System Demo</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <ErrorBoundaryExample />
        <APIErrorExample />
        <SWRExample />
        <OfflineExample />
        <ImageFallbackExample />
        <ErrorDisplayVariantsExample />
        <ProgrammaticErrorExample />
        <CompleteIntegrationExample />
      </div>
    </div>
  );
}
