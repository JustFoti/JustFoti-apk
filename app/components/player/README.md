# Advanced Video Player

A full-featured video player component with HLS.js integration, custom controls, gesture support, and keyboard shortcuts.

## Features

### Core Functionality
- ✅ HLS.js integration for adaptive streaming
- ✅ Custom controls with smooth animations
- ✅ Timeline with scrubbing and preview support
- ✅ Quality selector for adaptive streaming
- ✅ WebVTT subtitle support with customizable styling
- ✅ Picture-in-Picture mode
- ✅ Fullscreen support
- ✅ Watch progress tracking and persistence
- ✅ Playback rate control (0.25x - 2x)

### Keyboard Shortcuts
- `Space` or `K` - Play/Pause
- `←` - Seek backward 5 seconds
- `→` - Seek forward 5 seconds
- `↑` - Increase volume
- `↓` - Decrease volume
- `F` - Toggle fullscreen
- `M` - Toggle mute
- `P` - Toggle picture-in-picture
- `0-9` - Seek to 0%-90% of video

### Mobile Gestures
- **Double tap** - Play/Pause
- **Horizontal swipe** - Seek forward/backward
- **Vertical swipe (right side)** - Adjust volume
- **Single tap** - Show/hide controls

## Usage

### Basic Example

```tsx
import { VideoPlayer } from '@/app/components/player/VideoPlayer';

export default function WatchPage() {
  return (
    <VideoPlayer
      src="https://example.com/video.m3u8"
      poster="https://example.com/poster.jpg"
      autoPlay={false}
    />
  );
}
```

### With Subtitles

```tsx
import { VideoPlayer } from '@/app/components/player/VideoPlayer';

const subtitles = [
  {
    id: 'en',
    label: 'English',
    language: 'en',
    url: '/subtitles/en.vtt',
    default: true,
  },
  {
    id: 'es',
    label: 'Spanish',
    language: 'es',
    url: '/subtitles/es.vtt',
  },
];

export default function WatchPage() {
  return (
    <VideoPlayer
      src="https://example.com/video.m3u8"
      poster="https://example.com/poster.jpg"
      subtitles={subtitles}
      autoPlay={false}
    />
  );
}
```

### With Progress Tracking

```tsx
import { VideoPlayer } from '@/app/components/player/VideoPlayer';

export default function WatchPage({ contentId }: { contentId: string }) {
  const handleProgress = (time: number, duration: number) => {
    console.log(`Watched ${time}s of ${duration}s`);
  };

  const handleComplete = () => {
    console.log('Video completed!');
  };

  return (
    <VideoPlayer
      src="https://example.com/video.m3u8"
      poster="https://example.com/poster.jpg"
      contentId={contentId}
      contentType="movie"
      onProgress={handleProgress}
      onComplete={handleComplete}
      autoPlay={false}
    />
  );
}
```

### With Start Time

```tsx
import { VideoPlayer } from '@/app/components/player/VideoPlayer';

export default function WatchPage() {
  return (
    <VideoPlayer
      src="https://example.com/video.m3u8"
      poster="https://example.com/poster.jpg"
      startTime={120} // Start at 2 minutes
      autoPlay={true}
    />
  );
}
```

## Props

### VideoPlayer

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | Required | Video source URL (supports HLS .m3u8 or regular video files) |
| `poster` | `string` | - | Poster image URL |
| `subtitles` | `SubtitleTrack[]` | `[]` | Array of subtitle tracks |
| `autoPlay` | `boolean` | `false` | Auto-play video on load |
| `startTime` | `number` | `0` | Start time in seconds |
| `onProgress` | `(time: number, duration: number) => void` | - | Progress callback |
| `onComplete` | `() => void` | - | Completion callback |
| `onError` | `(error: Error) => void` | - | Error callback |
| `contentId` | `string` | - | Content ID for progress tracking |
| `contentType` | `'movie' \| 'episode'` | - | Content type for analytics |

### SubtitleTrack

```typescript
interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  url: string;
  default?: boolean;
}
```

## Components

### VideoPlayer
Main player component that orchestrates all functionality.

### Controls
Custom control bar with play/pause, timeline, volume, settings, and fullscreen controls.

### Timeline
Interactive timeline with scrubbing, buffering indicator, and hover preview.

### SubtitleRenderer
WebVTT subtitle parser and renderer with customizable styling.

## Hooks

### useVideoPlayer
Manages video player state and HLS.js integration.

### useWatchProgress
Handles watch progress tracking and localStorage persistence.

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (native HLS)
- Mobile browsers: Full support with touch gestures

## Performance

- Lazy loading of HLS.js
- Efficient subtitle parsing
- Debounced progress saving
- Hardware-accelerated video decoding
- Minimal re-renders with optimized state management

## Accessibility

- ARIA labels on all controls
- Keyboard navigation support
- Focus indicators
- Screen reader compatible
- Semantic HTML structure

## Notes

- Watch progress is saved to localStorage every 5 seconds
- Progress is cleared when video is completed (last 30 seconds)
- Saved progress expires after 7 days
- HLS.js automatically handles quality switching in auto mode
- Subtitles support basic HTML formatting (b, i, u tags)
