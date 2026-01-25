/**
 * Video Player Component
 * Full-featured video player with HLS support for DLHD and CDN Live
 */

'use client';

import { memo, useEffect, useState, useRef, useCallback } from 'react';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { useCast, CastMedia } from '@/hooks/useCast';
import { LiveEvent, TVChannel } from '../hooks/useLiveTVData';
import styles from '../LiveTV.module.css';

// Copy URL button with feedback
function CopyUrlButton({ getUrl }: { getUrl: () => string | null }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = getUrl();
    if (!url) return;
    
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <button 
      onClick={handleCopy} 
      className={styles.copyUrlButton}
      title="Copy stream URL for external player"
    >
      {copied ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Copied!</span>
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span>URL</span>
        </>
      )}
    </button>
  );
}

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
    serverStatuses,
    elapsedTime,
    getStreamUrlForCopy,
    loadStream,
    stopStream,
    togglePlay,
    toggleMute,
    setVolume,
    toggleFullscreen,
  } = useVideoPlayer();

  const [showControls, setShowControls] = useState(true);
  const [castError, setCastError] = useState<string | null>(null);
  const castErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get the stream URL for casting
  const streamUrl = getStreamUrlForCopy();

  // Cast/AirPlay support
  const handleCastConnect = useCallback(() => {
    console.log('[LiveTV Player] Cast/AirPlay connected');
    setCastError(null);
  }, []);

  const handleCastDisconnect = useCallback(() => {
    console.log('[LiveTV Player] Cast/AirPlay disconnected');
  }, []);

  const handleCastError = useCallback((error: string) => {
    console.error('[LiveTV Player] Cast error:', error);
    setCastError(error);
    if (castErrorTimeoutRef.current) {
      clearTimeout(castErrorTimeoutRef.current);
    }
    // Don't auto-dismiss help messages
    const isHelpMessage = error.includes('LG') || error.includes('Samsung') || 
                          error.includes('Cast tab') || error.includes('screen mirroring');
    if (!isHelpMessage) {
      castErrorTimeoutRef.current = setTimeout(() => {
        setCastError(null);
      }, 5000);
    }
  }, []);

  const cast = useCast({
    videoRef,
    streamUrl: streamUrl || undefined,
    onConnect: handleCastConnect,
    onDisconnect: handleCastDisconnect,
    onError: handleCastError,
  });

  // Build cast media object for live TV
  const getCastMedia = useCallback((): CastMedia | undefined => {
    if (!streamUrl) return undefined;
    
    const displayTitle = event?.title || channel?.name || 'Live TV';
    
    // Convert relative URLs to absolute URLs for Chromecast
    let castUrl = streamUrl;
    if (streamUrl.startsWith('/')) {
      castUrl = `${window.location.origin}${streamUrl}`;
    }
    
    return {
      url: castUrl,
      title: displayTitle,
      subtitle: event?.sport || channel?.category || 'Live Stream',
      contentType: 'application/x-mpegURL',
      isLive: true,
    };
  }, [streamUrl, event, channel]);

  // Handle cast button click
  const handleCastClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If already casting, stop
    if (cast.isCasting || cast.isAirPlayActive) {
      cast.stop();
      return;
    }
    
    // If already connected, load media
    if (cast.isConnected) {
      const media = getCastMedia();
      if (media) {
        videoRef.current?.pause();
        await cast.loadMedia(media);
      }
      return;
    }
    
    // Try to start a cast session
    const connected = await cast.requestSession();
    
    if (connected) {
      const media = getCastMedia();
      if (media) {
        videoRef.current?.pause();
        await cast.loadMedia(media);
      }
    }
  }, [cast, getCastMedia, videoRef]);

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
      let streamType = event.source;
      
      if (event.source === 'viprow') {
        // VIPRow uses direct URL, not channel ID
        loadStream({
          type: 'viprow',
          channelId: event.viprowUrl || event.id,
          viprowUrl: event.viprowUrl,
          title: event.title,
          poster: event.poster,
        });
        return;
      } else if (event.source === 'dlhd' && event.channels?.length > 0) {
        channelId = event.channels[0].channelId;
      } else if (event.source === 'cdnlive' && event.channels?.length > 0) {
        channelId = event.channels[0].channelId;
      } else {
        channelId = event.id;
      }
      
      loadStream({
        type: streamType,
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
          // @ts-ignore - iOS/Safari AirPlay attributes
          x-webkit-airplay="allow"
          // @ts-ignore
          webkit-playsinline="true"
          // @ts-ignore - Allow AirPlay
          airplay="allow"
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
              
              {/* Server Status Indicator */}
              {serverStatuses.length > 0 && (
                <div className={styles.serverStatusContainer}>
                  <div className={styles.serverStatusHeader}>
                    <span>Checking servers...</span>
                    <span className={styles.elapsedTime}>{(elapsedTime / 10).toFixed(1)}s</span>
                  </div>
                  <div className={styles.serverStatusList}>
                    {serverStatuses.map((server, idx) => (
                      <div key={idx} className={`${styles.serverStatusItem} ${styles[`status${server.status.charAt(0).toUpperCase() + server.status.slice(1)}`]}`}>
                        <span className={styles.serverStatusIcon}>
                          {server.status === 'pending' && '○'}
                          {server.status === 'checking' && '◐'}
                          {server.status === 'success' && '✓'}
                          {server.status === 'failed' && '✗'}
                        </span>
                        <span className={styles.serverStatusName}>{server.name}</span>
                        {server.elapsed !== undefined && (
                          <span className={styles.serverStatusElapsed}>
                            {(server.elapsed / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                    if (event.source === 'viprow') {
                      loadStream({
                        type: 'viprow',
                        channelId: event.viprowUrl || event.id,
                        viprowUrl: event.viprowUrl,
                        title: event.title,
                        poster: event.poster,
                      });
                    } else {
                      let channelId: string;
                      if (event.channels?.length > 0) {
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
                    }
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

        {/* Cast Error Message */}
        {castError && (
          <div className={styles.castErrorOverlay}>
            <div className={styles.castErrorContent}>
              <button 
                className={styles.castErrorClose}
                onClick={() => setCastError(null)}
              >
                ✕
              </button>
              <div className={styles.castErrorIcon}>📺</div>
              <p className={styles.castErrorText}>{castError}</p>
            </div>
          </div>
        )}

        {/* Cast Overlay - shown when casting to TV */}
        {(cast.isCasting || cast.isAirPlayActive) && (
          <div className={styles.castActiveOverlay}>
            <div className={styles.castActiveContent}>
              <div className={styles.castActiveIcon}>
                {cast.isAirPlayAvailable ? (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 22h12l-6-6-6 6z" />
                    <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v-2H3V5h18v12h-4v2h4c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                  </svg>
                ) : (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 18v3h3c0-1.66-1.34-3-3-3z" />
                    <path d="M1 14v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7z" />
                    <path d="M1 10v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z" />
                    <path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                  </svg>
                )}
              </div>
              <h3 className={styles.castActiveTitle}>
                {cast.isAirPlayActive ? 'AirPlaying to TV' : 'Casting to TV'}
              </h3>
              <p className={styles.castActiveSubtitle}>{displayTitle}</p>
              <button 
                className={styles.stopCastButton}
                onClick={() => cast.stop()}
              >
                Stop {cast.isAirPlayActive ? 'AirPlay' : 'Casting'}
              </button>
            </div>
          </div>
        )}

        {/* Controls - hide for iframe mode since iframe has its own controls */}
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
                <CopyUrlButton getUrl={getStreamUrlForCopy} />
              )}

              {currentSource && (
                <span className={styles.sourceLabel}>
                  {currentSource.type.toUpperCase()}
                </span>
              )}

              {/* Cast/AirPlay button */}
              <button 
                onClick={handleCastClick} 
                className={`${styles.castButton} ${cast.isCasting || cast.isAirPlayActive ? styles.active : ''}`}
                title={cast.isCasting || cast.isAirPlayActive 
                  ? 'Stop casting' 
                  : cast.isAirPlayAvailable 
                    ? 'AirPlay to Apple TV' 
                    : 'Cast to TV'}
              >
                {cast.isAirPlayAvailable ? (
                  // AirPlay icon
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 22h12l-6-6-6 6z" />
                    <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v-2H3V5h18v12h-4v2h4c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                  </svg>
                ) : (
                  // Chromecast icon
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 18v3h3c0-1.66-1.34-3-3-3z" />
                    <path d="M1 14v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7z" />
                    <path d="M1 10v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z" />
                    <path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                  </svg>
                )}
              </button>

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
