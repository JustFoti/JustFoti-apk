/**
 * Analytics Hook Usage Examples
 * Demonstrates how to integrate analytics tracking in components
 */

'use client';

import { useEffect } from 'react';
import {
  usePageTracking,
  useAnalytics,
  useSearchTracking,
  useContentTracking,
  usePlaybackTracking,
  useAnalyticsPrivacy,
} from './useAnalytics';

/**
 * Example 1: Automatic Page View Tracking
 * Add this to your root layout to track all page views
 */
export function RootLayoutWithTracking({ children }: { children: React.ReactNode }) {
  // Automatically tracks page views on route changes
  usePageTracking();

  return <>{children}</>;
}

/**
 * Example 2: Search Component with Analytics
 */
export function SearchComponentExample() {
  const { trackSearch } = useSearchTracking();

  const handleSearch = async (query: string) => {
    // Perform search
    const results = await fetch(`/api/search?q=${query}`).then(r => r.json());
    
    // Track the search event
    trackSearch(query, results.length);
  };

  const handleResultClick = (query: string, resultId: string, totalResults: number) => {
    // Track when user selects a result
    trackSearch(query, totalResults, resultId);
  };

  return (
    <div>
      <input
        type="search"
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
      />
    </div>
  );
}

/**
 * Example 3: Content Details Page with Analytics
 */
export function ContentDetailsExample({
  contentId,
  contentType,
  title,
}: {
  contentId: string;
  contentType: 'movie' | 'tv';
  title: string;
}) {
  const { trackContentView } = useContentTracking();

  useEffect(() => {
    // Track content view when component mounts
    trackContentView(contentId, contentType, title);
  }, [contentId, contentType, title, trackContentView]);

  return (
    <div>
      <h1>{title}</h1>
      {/* Content details */}
    </div>
  );
}

/**
 * Example 4: Video Player with Playback Analytics
 */
export function VideoPlayerExample({
  contentId,
  contentType,
}: {
  contentId: string;
  contentType: 'movie' | 'episode';
}) {
  const { trackPlay, trackPause, trackSeek, trackComplete } = usePlaybackTracking();

  const handlePlay = (currentTime: number, duration: number, quality: string) => {
    trackPlay(contentId, contentType, currentTime, duration, quality);
  };

  const handlePause = (currentTime: number, duration: number, quality: string) => {
    trackPause(contentId, contentType, currentTime, duration, quality);
  };

  const handleSeek = (currentTime: number, duration: number, quality: string) => {
    trackSeek(contentId, contentType, currentTime, duration, quality);
  };

  const handleComplete = (currentTime: number, duration: number, quality: string) => {
    trackComplete(contentId, contentType, currentTime, duration, quality);
  };

  return (
    <video
      onPlay={(e) => {
        const video = e.currentTarget;
        handlePlay(video.currentTime, video.duration, '1080p');
      }}
      onPause={(e) => {
        const video = e.currentTarget;
        handlePause(video.currentTime, video.duration, '1080p');
      }}
      onSeeked={(e) => {
        const video = e.currentTarget;
        handleSeek(video.currentTime, video.duration, '1080p');
      }}
      onEnded={(e) => {
        const video = e.currentTarget;
        handleComplete(video.currentTime, video.duration, '1080p');
      }}
    >
      <source src="/video.mp4" />
    </video>
  );
}

/**
 * Example 5: Custom Event Tracking
 */
export function CustomEventExample() {
  const { trackEvent } = useAnalytics();

  const handleButtonClick = () => {
    // Track custom events
    trackEvent('page_view', {
      buttonName: 'subscribe',
      location: 'hero-section',
    });
  };

  return (
    <button onClick={handleButtonClick}>
      Subscribe
    </button>
  );
}

/**
 * Example 6: Privacy Controls Component
 */
export function PrivacyControlsExample() {
  const { optOut, optIn, isOptedOut } = useAnalyticsPrivacy();
  const optedOut = isOptedOut();

  return (
    <div>
      <h3>Analytics Privacy</h3>
      <p>Status: {optedOut ? 'Opted Out' : 'Opted In'}</p>
      
      {optedOut ? (
        <button onClick={optIn}>
          Enable Analytics
        </button>
      ) : (
        <button onClick={optOut}>
          Disable Analytics
        </button>
      )}
      
      <p>
        We respect your privacy. Analytics help us improve the platform.
        You can opt out at any time.
      </p>
    </div>
  );
}

/**
 * Example 7: Complete Analytics Integration
 * Shows how to use all analytics features together
 */
export function CompleteAnalyticsExample() {
  const analytics = useAnalytics();

  useEffect(() => {
    // Check if user has opted out
    if (analytics.isOptedOut()) {
      console.log('User has opted out of analytics');
      return;
    }

    // Get current session ID
    const sessionId = analytics.getSessionId();
    console.log('Session ID:', sessionId);

    // Track a custom event
    analytics.trackEvent('page_view', {
      component: 'CompleteAnalyticsExample',
      timestamp: Date.now(),
    });

    // Cleanup: flush events on unmount
    return () => {
      analytics.flush();
    };
  }, [analytics]);

  return (
    <div>
      <h2>Analytics Integration Example</h2>
      
      {/* Search with tracking */}
      <input
        type="search"
        onChange={(e) => {
          // Simulate search
          const results = ['result1', 'result2'];
          analytics.trackSearch(e.target.value, results.length);
        }}
      />

      {/* Content card with tracking */}
      <div
        onClick={() => {
          analytics.trackContentView('movie-123', 'movie', 'Example Movie');
        }}
      >
        <h3>Example Movie</h3>
      </div>

      {/* Privacy controls */}
      <button
        onClick={() => {
          if (analytics.isOptedOut()) {
            analytics.optIn();
          } else {
            analytics.optOut();
          }
        }}
      >
        Toggle Analytics
      </button>
    </div>
  );
}

/**
 * Example 8: Integration with Existing Video Player Hook
 */
export function IntegratedVideoPlayerExample({
  contentId,
  contentType,
}: {
  contentId: string;
  contentType: 'movie' | 'episode';
}) {
  const { trackPlay, trackPause, trackSeek, trackComplete } = usePlaybackTracking();

  // This would integrate with your existing useVideoPlayer hook
  const handlePlayerEvent = (
    event: 'play' | 'pause' | 'seek' | 'complete',
    currentTime: number,
    duration: number,
    quality: string
  ) => {
    switch (event) {
      case 'play':
        trackPlay(contentId, contentType, currentTime, duration, quality);
        break;
      case 'pause':
        trackPause(contentId, contentType, currentTime, duration, quality);
        break;
      case 'seek':
        trackSeek(contentId, contentType, currentTime, duration, quality);
        break;
      case 'complete':
        trackComplete(contentId, contentType, currentTime, duration, quality);
        break;
    }
  };

  return (
    <div>
      {/* Your video player component */}
      <p>Video player with integrated analytics</p>
    </div>
  );
}
