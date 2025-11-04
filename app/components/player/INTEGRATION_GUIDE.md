# Video Player Integration Guide

## Quick Start

### 1. Install Dependencies

The video player requires HLS.js, which is already installed in the project:

```json
{
  "dependencies": {
    "hls.js": "^1.6.10"
  }
}
```

### 2. Import the Component

```tsx
import { VideoPlayer } from '@/app/components/player';
```

### 3. Basic Usage

```tsx
export default function WatchPage() {
  return (
    <VideoPlayer
      src="https://example.com/video.m3u8"
      poster="https://example.com/poster.jpg"
    />
  );
}
```

## Integration with Flyx Routes

### Watch Page Example

Create a watch page at `app/(routes)/watch/[id]/page.tsx`:

```tsx
import { VideoPlayer } from '@/app/components/player';
import { tmdbService } from '@/app/lib/services/tmdb';
import { extractorService } from '@/app/lib/services/extractor';

interface WatchPageProps {
  params: {
    id: string;
  };
  searchParams: {
    type?: 'movie' | 'tv';
    season?: string;
    episode?: string;
  };
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { id } = params;
  const { type = 'movie', season, episode } = searchParams;

  // Fetch content details
  const content = await tmdbService.getDetails(id, type);
  
  // Extract video stream URL
  const streamUrl = await extractorService.extractStream({
    tmdbId: id,
    type,
    season: season ? parseInt(season) : undefined,
    episode: episode ? parseInt(episode) : undefined,
  });

  // Fetch subtitles if available
  const subtitles = content.subtitles || [];

  return (
    <div className="watch-container">
      <VideoPlayer
        src={streamUrl}
        poster={content.backdropPath}
        subtitles={subtitles}
        contentId={`${type}-${id}${season ? `-s${season}e${episode}` : ''}`}
        contentType={type === 'tv' ? 'episode' : 'movie'}
        autoPlay={true}
        onComplete={() => {
          // Handle completion (e.g., show next episode)
          console.log('Video completed');
        }}
        onError={(error) => {
          // Handle errors
          console.error('Playback error:', error);
        }}
      />

      {/* Content info below player */}
      <div className="content-info">
        <h1>{content.title}</h1>
        <p>{content.overview}</p>
      </div>
    </div>
  );
}
```

### Details Page Integration

Add a "Watch Now" button on the details page:

```tsx
import Link from 'next/link';
import { Play } from 'lucide-react';

export function WatchButton({ contentId, type }: { contentId: string; type: 'movie' | 'tv' }) {
  return (
    <Link href={`/watch/${contentId}?type=${type}`}>
      <button className="watch-button">
        <Play size={20} />
        Watch Now
      </button>
    </Link>
  );
}
```

## API Route for Stream Extraction

Create an API route at `app/api/stream/extract/route.ts`:

```tsx
import { NextRequest, NextResponse } from 'next/server';
import { extractorService } from '@/app/lib/services/extractor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tmdbId, type, season, episode } = body;

    const streamUrl = await extractorService.extractStream({
      tmdbId,
      type,
      season,
      episode,
    });

    return NextResponse.json({ streamUrl });
  } catch (error) {
    console.error('Stream extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract stream' },
      { status: 500 }
    );
  }
}
```

## Subtitle Format

Subtitles should be in WebVTT format. Example structure:

```vtt
WEBVTT

00:00:00.000 --> 00:00:05.000
First subtitle line

00:00:05.000 --> 00:00:10.000
Second subtitle line
```

### Fetching Subtitles

```tsx
const subtitles = [
  {
    id: 'en',
    label: 'English',
    language: 'en',
    url: `/api/subtitles/${contentId}/en.vtt`,
    default: true,
  },
  {
    id: 'es',
    label: 'Spanish',
    language: 'es',
    url: `/api/subtitles/${contentId}/es.vtt`,
  },
];
```

## Analytics Integration

Track playback events:

```tsx
import { analyticsService } from '@/app/lib/services/analytics';

<VideoPlayer
  src={streamUrl}
  contentId={contentId}
  contentType="movie"
  onProgress={(time, duration) => {
    // Track watch progress
    analyticsService.trackEvent({
      eventType: 'play',
      metadata: {
        contentId,
        currentTime: time,
        duration,
      },
    });
  }}
  onComplete={() => {
    // Track completion
    analyticsService.trackEvent({
      eventType: 'complete',
      metadata: {
        contentId,
      },
    });
  }}
/>
```

## Styling

The player comes with default styles, but you can customize the container:

```css
.watch-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.content-info {
  margin-top: 2rem;
  color: #fff;
}

.watch-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.watch-button:hover {
  transform: scale(1.05);
}
```

## Mobile Optimization

The player is fully responsive and includes touch gestures. No additional configuration needed.

### Recommended Mobile Layout

```tsx
<div className="mobile-watch-container">
  <VideoPlayer
    src={streamUrl}
    poster={poster}
    contentId={contentId}
  />
  
  {/* Show minimal info on mobile */}
  <div className="mobile-info">
    <h2>{title}</h2>
  </div>
</div>
```

```css
@media (max-width: 768px) {
  .mobile-watch-container {
    padding: 0;
  }

  .mobile-info {
    padding: 1rem;
  }
}
```

## Error Handling

Implement proper error handling:

```tsx
'use client';

import { useState } from 'react';
import { VideoPlayer } from '@/app/components/player';

export function WatchPageClient({ streamUrl, poster, contentId }) {
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="error-container">
        <h2>Playback Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <VideoPlayer
      src={streamUrl}
      poster={poster}
      contentId={contentId}
      onError={(err) => {
        setError(err.message);
      }}
    />
  );
}
```

## Performance Tips

1. **Preload Stream URLs**: Fetch stream URLs on the details page to enable instant playback
2. **Optimize Posters**: Use optimized poster images (WebP format)
3. **CDN**: Serve video content from a CDN for better performance
4. **Lazy Load**: Only load the player when needed (e.g., on watch page)

## Testing

Test the player with different scenarios:

```tsx
// Test with HLS stream
<VideoPlayer src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" />

// Test with regular video
<VideoPlayer src="/videos/sample.mp4" />

// Test with subtitles
<VideoPlayer
  src="https://example.com/video.m3u8"
  subtitles={[
    { id: 'en', label: 'English', language: 'en', url: '/subs/en.vtt' }
  ]}
/>

// Test error handling
<VideoPlayer
  src="https://invalid-url.com/video.m3u8"
  onError={(err) => console.error(err)}
/>
```

## Next Steps

1. Create the watch page route
2. Integrate with extractor service
3. Add subtitle fetching
4. Implement analytics tracking
5. Test on various devices and browsers
6. Optimize for production

## Support

For issues or questions about the video player:
- Check the README.md for detailed documentation
- Review examples.tsx for usage patterns
- See IMPLEMENTATION.md for technical details
