/**
 * Video Player Component
 * Full-featured video player with controls and HLS support
 */

'use client';

import { memo, useEffect, useState, useRef, useCallback } from 'react';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { LiveEvent, DLHDChannel } from '../hooks/useLiveTVData';
import styles from '../LiveTV.module.css';

// Sport icon mapping
const SPORT_ICONS: Record<string, string> = {
  soccer: '⚽',
  football: '⚽',
  basketball: '🏀',
  tennis: '🎾',
  cricket: '🏏',
  hockey: '🏒',
  baseball: '⚾',
  golf: '⛳',
  rugby: '🏉',
  motorsport: '🏎️',
  f1: '🏎️',
  boxing: '🥊',
  mma: '🥊',
  ufc: '🥊',
  wwe: '🤼',
  volleyball: '🏐',
  nfl: '🏈',
  darts: '🎯',
};

function getSportIcon(sport: string): string {
  const lower = sport.toLowerCase();
  for (const [key, icon] of Object.entries(SPORT_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '📺';
}

interface VideoPlayerProps {
  event?: LiveEvent | null;
  channel?: DLHDChannel | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VideoPlayer = memo(function VideoPlayer({
  event,
  channel,
  isOpen,
  onClose,
}: VideoPlayerProps) {
  const {
    videoRef,
    isPlaying,
    isMuted,
    isFullscreen,
    isLoading,
    error,
    volume,
    currentSource,
    loadStream,
    stopStream,
    togglePlay,
    toggleMute,
    setVolume,
    toggleFullscreen,
  } = useVideoPlayer();

  const [showControls, setShowControls] = useState(true);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  // Load stream when event or channel changes
  useEffect(() => {
    if (!isOpen) {
      stopStream();
      return;
    }

    if (event) {
      const source = {
        type: event.source,
        channelId: event.channels[0]?.channelId || event.ppvUriName || event.cdnliveEmbedId || event.id,
        title: event.title,
        poster: event.poster,
      };
      loadStream(source);
    } else if (channel) {
      const source = {
        type: 'dlhd' as const,
        channelId: channel.id,
        title: channel.name,
        poster: undefined,
      };
      loadStream(source);
    } else {
      stopStream();
    }
  }, [event, channel, isOpen, loadStream, stopStream]);

  // Auto-hide controls after 3 seconds
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isLoading) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying, isLoading]);

  useEffect(() => {
    if (isPlaying && !isLoading) {
      resetHideTimer();
    } else {
      setShowControls(true);
    }
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isPlaying, isLoading, resetHideTimer]);

  const handleMouseMove = () => {
    resetHideTimer();
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          e.preventDefault();
          if (isFullscreen) {
            toggleFullscreen();
          } else {
            onClose();
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, togglePlay, toggleMute, toggleFullscreen, isFullscreen, onClose, volume, setVolume]);

  if (!isOpen || (!event && !channel)) {
    return null;
  }

  const displayTitle = event?.title || channel?.name || 'Stream';
  const displaySport = event?.sport || channel?.category;
  const isLive = event?.isLive ?? true;


  return (
    <div className={styles.playerModal}>
      <div className={styles.playerContainer} onMouseMove={handleMouseMove}>
        {/* Video Element */}
        <video
          ref={videoRef}
          className={styles.videoElement}
          playsInline
          onClick={togglePlay}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading stream...</p>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className={styles.errorOverlay}>
            <div className={styles.errorContent}>
              <div className={styles.errorIcon}>⚠️</div>
              <h3>Stream Error</h3>
              <p>{error}</p>
              <button
                onClick={() => {
                  if (event) {
                    loadStream({
                      type: event.source,
                      channelId: event.channels[0]?.channelId || event.ppvUriName || event.cdnliveEmbedId || event.id,
                      title: event.title,
                      poster: event.poster,
                    });
                  } else if (channel) {
                    loadStream({
                      type: 'dlhd' as const,
                      channelId: channel.id,
                      title: channel.name,
                      poster: undefined,
                    });
                  }
                }}
                className={styles.retryButton}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className={`${styles.playerControls} ${!showControls ? styles.hidden : ''}`}>
          {/* Top Bar */}
          <div className={styles.topControls}>
            <div className={styles.eventInfo}>
              <h3 className={styles.eventTitle}>{displayTitle}</h3>
              <div>
                {displaySport && (
                  <span className={styles.eventSport}>
                    {getSportIcon(displaySport)} {displaySport}
                  </span>
                )}
                {isLive && (
                  <span className={styles.liveIndicator}>
                    <span className={styles.liveDot}></span>
                    LIVE
                  </span>
                )}
              </div>
            </div>

            <button onClick={onClose} className={styles.closeButton} aria-label="Close player">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Bottom Controls */}
          <div className={styles.bottomControls}>
            <div className={styles.controlsRow}>
              {/* Play/Pause */}
              <button onClick={togglePlay} className={styles.playPauseButton} aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>

              {/* Volume */}
              <div className={styles.volumeControls}>
                <button onClick={toggleMute} className={styles.muteButton} aria-label={isMuted ? 'Unmute' : 'Mute'}>
                  {isMuted || volume === 0 ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                      <line x1="23" y1="9" x2="17" y2="15"/>
                      <line x1="17" y1="9" x2="23" y2="15"/>
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                      <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className={styles.volumeSlider}
                  aria-label="Volume"
                />
              </div>

              <div className={styles.controlsSpacer}></div>

              {/* Source Info */}
              {currentSource && (
                <span className={styles.sourceLabel}>
                  {currentSource.type.toUpperCase()}
                </span>
              )}

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className={styles.fullscreenButton} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
                {isFullscreen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
