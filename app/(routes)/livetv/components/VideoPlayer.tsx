/**
 * Video Player Component
 * Full-featured video player with HLS support for DLHD, CDN Live, and PPV
 */

'use client';

import { memo, useEffect, useState, useRef, useCallback } from 'react';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { LiveEvent, TVChannel } from '../hooks/useLiveTVData';
import styles from '../LiveTV.module.css';

const SPORT_ICONS: Record<string, string> = {
  soccer: '⚽', football: '⚽', basketball: '🏀', tennis: '🎾',
  cricket: '🏏', hockey: '🏒', baseball: '⚾', golf: '⛳',
  rugby: '🏉', motorsport: '🏎️', f1: '🏎️', boxing: '🥊',
  mma: '🥊', ufc: '🥊', wwe: '🤼', volleyball: '🏐',
  nfl: '🏈', darts: '🎯',
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
  channel?: TVChannel | null;
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
    isBuffering,
    loadingStage,
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
  const containerRef = useRef<HTMLDivElement>(null);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    hideTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isLoading && !isBuffering) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying, isLoading, isBuffering]);

  // Load stream when event or channel changes
  useEffect(() => {
    if (!isOpen) {
      stopStream();
      return;
    }
    
    if (event) {
      let channelId: string;
      
      if (event.source === 'ppv' && event.ppvUriName) {
        channelId = event.ppvUriName;
      } else if (event.source === 'dlhd' && event.channels?.length > 0) {
        channelId = event.channels[0].channelId;
      } else if (event.source === 'cdnlive' && event.channels?.length > 0) {
        channelId = event.channels[0].channelId;
      } else {
        channelId = event.id;
      }
      
      loadStream({
        type: event.source,
        channelId,
        title: event.title,
        poster: event.poster,
      });
    } else if (channel) {
      // Use the channel's source and channelId
      const streamType = channel.source || 'dlhd';
      loadStream({
        type: streamType,
        channelId: channel.channelId || channel.id,
        title: channel.name,
        poster: channel.logo,
      });
    } else {
      stopStream();
    }
  }, [event?.id, channel?.id, isOpen, event, channel, loadStream, stopStream]);

  useEffect(() => {
    if (isPlaying && !isLoading && !isBuffering) {
      resetHideTimer();
    } else {
      setShowControls(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    }
  }, [isPlaying, isLoading, isBuffering, resetHideTimer]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const handleInteraction = useCallback(() => {
    resetHideTimer();
  }, [resetHideTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      handleInteraction();
      
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
          if (!isFullscreen) onClose();
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
  }, [isOpen, isFullscreen, volume, togglePlay, toggleMute, toggleFullscreen, setVolume, onClose, handleInteraction]);

  if (!isOpen || (!event && !channel)) return null;

  const displayTitle = event?.title || channel?.name || 'Stream';
  const displaySport = event?.sport || channel?.category || '';
  const isLive = event?.isLive ?? true;

  // Loading stage messages
  const getLoadingMessage = () => {
    switch (loadingStage) {
      case 'fetching':
        return 'Fetching stream info...';
      case 'connecting':
        return 'Connecting to stream...';
      case 'buffering':
        return 'Buffering...';
      default:
        return 'Loading stream...';
    }
  };

  return (
    <div className={styles.playerModal}>
      <div 
        ref={containerRef}
        className={styles.playerContainer}
        onMouseMove={handleInteraction}
        onTouchStart={handleInteraction}
      >
        <video
          ref={videoRef}
          className={styles.videoElement}
          playsInline
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
            handleInteraction();
          }}
        />

        {/* Loading Overlay - shows during initial load */}
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingContent}>
              <div className={styles.loadingSpinnerLarge} />
              <p className={styles.loadingText}>{getLoadingMessage()}</p>
              <p className={styles.loadingSubtext}>{displayTitle}</p>
            </div>
          </div>
        )}

        {/* Buffering Indicator - shows during playback buffering */}
        {isBuffering && !isLoading && (
          <div className={styles.bufferingOverlay}>
            <div className={styles.bufferingSpinner} />
          </div>
        )}

        {error && (
          <div className={styles.errorOverlay}>
            <div className={styles.errorContent}>
              <div className={styles.errorIcon}>⚠️</div>
              <h3>Stream Error</h3>
              <p>{error}</p>
              <button 
                onClick={() => {
                  if (event) {
                    let channelId: string;
                    if (event.source === 'ppv' && event.ppvUriName) {
                      channelId = event.ppvUriName;
                    } else if (event.channels?.length > 0) {
                      channelId = event.channels[0].channelId;
                    } else {
                      channelId = event.id;
                    }
                    loadStream({
                      type: event.source,
                      channelId,
                      title: event.title,
                      poster: event.poster,
                    });
                  } else if (channel) {
                    const streamType = channel.source || 'dlhd';
                    loadStream({
                      type: streamType,
                      channelId: channel.channelId || channel.id,
                      title: channel.name,
                      poster: channel.logo,
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

        <div className={`${styles.playerControls} ${!showControls ? styles.hidden : ''}`}>
          {/* Top Controls */}
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
            
            <button onClick={onClose} className={styles.closeButton}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Bottom Controls */}
          <div className={styles.bottomControls}>
            <div className={styles.controlsRow}>
              <button onClick={togglePlay} className={styles.playPauseButton}>
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

              <div className={styles.volumeControls}>
                <button onClick={toggleMute} className={styles.muteButton}>
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
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className={styles.volumeSlider}
                  aria-label="Volume"
                />
              </div>

              <div className={styles.controlsSpacer}></div>

              {currentSource && (
                <span className={styles.sourceLabel}>
                  {currentSource.type.toUpperCase()}
                </span>
              )}

              <button onClick={toggleFullscreen} className={styles.fullscreenButton}>
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
