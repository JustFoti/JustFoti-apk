'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import styles from './WatchPage.module.css';

interface StreamData {
  success: boolean;
  streamUrl?: string;
  error?: string;
  server?: string;
  requiresProxy?: boolean;
}

/**
 * Watch Page Client Component
 * Uses the old extract-shadowlands and stream-proxy endpoints
 */
export default function WatchPageClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const contentId = params.id as string;
  const mediaType = searchParams.get('type') as 'movie' | 'tv';
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');
  
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stream URL using extract-shadowlands endpoint
  const fetchStream = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query parameters for extract-shadowlands
      const params = new URLSearchParams({
        tmdbId: contentId,
      });

      if (mediaType === 'tv' && season && episode) {
        params.append('season', season);
        params.append('episode', episode);
      }

      console.log('🔍 Fetching stream from extract-shadowlands:', params.toString());

      const response = await fetch(`/api/extract-shadowlands?${params}`);
      const data: StreamData = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract stream');
      }

      if (!data.streamUrl) {
        throw new Error('No stream URL returned');
      }

      // Use stream-proxy for CORS handling
      const proxiedUrl = `/api/stream-proxy?url=${encodeURIComponent(data.streamUrl)}&source=shadowlands`;
      console.log('✅ Stream URL obtained, using proxy:', proxiedUrl);
      
      setStreamUrl(proxiedUrl);
    } catch (err) {
      console.error('❌ Stream extraction error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stream');
    } finally {
      setLoading(false);
    }
  }, [contentId, mediaType, season, episode]);

  useEffect(() => {
    if (contentId && mediaType) {
      fetchStream();
    }
  }, [contentId, mediaType, fetchStream]);

  const handleBack = () => {
    router.back();
  };

  const handleRetry = () => {
    fetchStream();
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading stream...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Failed to Load Stream</h2>
          <p>{error}</p>
          <div className={styles.errorActions}>
            <button onClick={handleRetry} className={styles.retryButton}>
              Retry
            </button>
            <button onClick={handleBack} className={styles.backButton}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!streamUrl) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>No Stream Available</h2>
          <p>Unable to find a stream for this content.</p>
          <button onClick={handleBack} className={styles.backButton}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.playerWrapper}>
        <button onClick={handleBack} className={styles.backButtonOverlay}>
          ← Back
        </button>
        
        <video
          className={styles.video}
          src={streamUrl}
          controls
          autoPlay
          playsInline
          onError={(e) => {
            console.error('Video playback error:', e);
            setError('Video playback failed. The stream may be unavailable.');
          }}
        />
      </div>
    </div>
  );
}
