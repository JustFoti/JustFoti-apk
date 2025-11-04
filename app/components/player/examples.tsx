/**
 * Video Player Examples
 * Demonstrates various usage patterns for the VideoPlayer component
 */

import { VideoPlayer } from './VideoPlayer';
import type { SubtitleTrack } from '@/app/types/player';

// Example 1: Basic video player
export function BasicPlayerExample() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h2>Basic Video Player</h2>
      <VideoPlayer
        src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
        poster="https://image.mux.com/x36xhzz/thumbnail.jpg"
      />
    </div>
  );
}

// Example 2: Player with subtitles
export function PlayerWithSubtitlesExample() {
  const subtitles: SubtitleTrack[] = [
    {
      id: 'en',
      label: 'English',
      language: 'en',
      url: '/subtitles/sample-en.vtt',
      default: true,
    },
    {
      id: 'es',
      label: 'Español',
      language: 'es',
      url: '/subtitles/sample-es.vtt',
    },
    {
      id: 'fr',
      label: 'Français',
      language: 'fr',
      url: '/subtitles/sample-fr.vtt',
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h2>Player with Multiple Subtitles</h2>
      <VideoPlayer
        src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
        poster="https://image.mux.com/x36xhzz/thumbnail.jpg"
        subtitles={subtitles}
      />
    </div>
  );
}

// Example 3: Player with progress tracking
export function PlayerWithProgressExample() {
  const handleProgress = (time: number, duration: number) => {
    const percent = (time / duration) * 100;
    console.log(`Progress: ${percent.toFixed(1)}%`);
  };

  const handleComplete = () => {
    console.log('Video completed!');
    // Could trigger next episode, show recommendations, etc.
  };

  const handleError = (error: Error) => {
    console.error('Player error:', error);
    // Could show error UI, retry logic, etc.
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h2>Player with Progress Tracking</h2>
      <VideoPlayer
        src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
        poster="https://image.mux.com/x36xhzz/thumbnail.jpg"
        contentId="movie-12345"
        contentType="movie"
        onProgress={handleProgress}
        onComplete={handleComplete}
        onError={handleError}
      />
    </div>
  );
}

// Example 4: Auto-play with start time
export function AutoPlayExample() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h2>Auto-play from Saved Position</h2>
      <VideoPlayer
        src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
        poster="https://image.mux.com/x36xhzz/thumbnail.jpg"
        startTime={60} // Start at 1 minute
        autoPlay={true}
      />
    </div>
  );
}

// Example 5: Episode player with auto-advance
export function EpisodePlayerExample() {
  const episodes = [
    { id: 'ep1', title: 'Episode 1', src: 'https://example.com/ep1.m3u8' },
    { id: 'ep2', title: 'Episode 2', src: 'https://example.com/ep2.m3u8' },
    { id: 'ep3', title: 'Episode 3', src: 'https://example.com/ep3.m3u8' },
  ];

  const currentEpisodeIndex = 0;
  const currentEpisode = episodes[currentEpisodeIndex];

  const handleComplete = () => {
    const nextIndex = currentEpisodeIndex + 1;
    if (nextIndex < episodes.length) {
      console.log(`Auto-advancing to ${episodes[nextIndex].title}`);
      // In real app, would update state to load next episode
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h2>Episode Player with Auto-Advance</h2>
      <p>Currently playing: {currentEpisode.title}</p>
      <VideoPlayer
        src={currentEpisode.src}
        contentId={currentEpisode.id}
        contentType="episode"
        onComplete={handleComplete}
      />
    </div>
  );
}

// Example 6: Responsive player grid
export function ResponsivePlayerGridExample() {
  const videos = [
    {
      id: '1',
      title: 'Video 1',
      src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      poster: 'https://image.mux.com/x36xhzz/thumbnail.jpg',
    },
    {
      id: '2',
      title: 'Video 2',
      src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      poster: 'https://image.mux.com/x36xhzz/thumbnail.jpg',
    },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Multiple Players</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '2rem',
        }}
      >
        {videos.map((video) => (
          <div key={video.id}>
            <h3>{video.title}</h3>
            <VideoPlayer
              src={video.src}
              poster={video.poster}
              contentId={video.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Example 7: Player with custom error handling
export function PlayerWithErrorHandlingExample() {
  const handleError = (error: Error) => {
    // Custom error handling
    alert(`Failed to load video: ${error.message}`);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h2>Player with Error Handling</h2>
      <VideoPlayer
        src="https://invalid-url.com/video.m3u8"
        poster="https://image.mux.com/x36xhzz/thumbnail.jpg"
        onError={handleError}
      />
    </div>
  );
}

// Example 8: Demo page with all features
export function FullFeaturedPlayerDemo() {
  const subtitles: SubtitleTrack[] = [
    {
      id: 'en',
      label: 'English',
      language: 'en',
      url: '/subtitles/sample-en.vtt',
      default: true,
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1>Advanced Video Player Demo</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>Features</h2>
        <ul>
          <li>HLS adaptive streaming</li>
          <li>Custom controls with animations</li>
          <li>Quality selector (Auto, 1080p, 720p, 480p)</li>
          <li>Playback speed control (0.25x - 2x)</li>
          <li>WebVTT subtitles</li>
          <li>Picture-in-Picture mode</li>
          <li>Fullscreen support</li>
          <li>Watch progress tracking</li>
          <li>Keyboard shortcuts</li>
          <li>Mobile gesture controls</li>
        </ul>
      </div>

      <VideoPlayer
        src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
        poster="https://image.mux.com/x36xhzz/thumbnail.jpg"
        subtitles={subtitles}
        contentId="demo-video"
        contentType="movie"
        onProgress={(time, duration) => {
          console.log(`${time.toFixed(1)}s / ${duration.toFixed(1)}s`);
        }}
        onComplete={() => {
          console.log('Video completed!');
        }}
      />

      <div style={{ marginTop: '2rem' }}>
        <h3>Keyboard Shortcuts</h3>
        <ul>
          <li><kbd>Space</kbd> or <kbd>K</kbd> - Play/Pause</li>
          <li><kbd>←</kbd> - Seek backward 5s</li>
          <li><kbd>→</kbd> - Seek forward 5s</li>
          <li><kbd>↑</kbd> - Volume up</li>
          <li><kbd>↓</kbd> - Volume down</li>
          <li><kbd>F</kbd> - Fullscreen</li>
          <li><kbd>M</kbd> - Mute</li>
          <li><kbd>P</kbd> - Picture-in-Picture</li>
          <li><kbd>0-9</kbd> - Seek to percentage</li>
        </ul>
      </div>
    </div>
  );
}
